const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * Send notification to user via FCM
 */
const sendNotification = async (userId, title, body, data = {}) => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log("User not found:", userId);
      return false;
    }

    const fcmTokens = userDoc.data().fcmTokens || {};
    const tokens = Object.keys(fcmTokens);

    if (tokens.length === 0) {
      console.log("No FCM tokens for user:", userId);
      return false;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        clickAction: data.link || "/",
      },
      webpush: {
        fcmOptions: {
          link: data.link || "/",
        },
        notification: {
          title: title,
          body: body,
          icon: "/logo.png",
          badge: "/logo.png",
        },
      },
    };

    const sendPromises = tokens.map((token) =>
      admin
        .messaging()
        .send({
          ...message,
          token: token,
        })
        .catch((error) => {
          if (error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered") {
            // Remove invalid token
            db.collection("users")
              .doc(userId)
              .update({
                [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete(),
              });
          }
        })
    );

    await Promise.all(sendPromises);
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

/**
 * Trigger: When piket report is uploaded
 * Send notification to supervisor (laporTo)
 */
exports.onPiketUpload = onDocumentCreated("piket/{piketId}", async (event) => {
  const piket = event.data.data();
  if (!piket || !piket.laporTo) return;

  const supervisorId = typeof piket.laporTo === 'string'
    ? piket.laporTo
    : (piket.laporTo.id || piket.laporTo.path?.split('/').pop());

  if (!supervisorId) return;

  const title = "Laporan Piket Baru";
  const body = `Ada laporan piket baru di ${piket.place || "Asrama"} yang perlu Anda verifikasi.`;

  await sendNotification(supervisorId, title, body, {
    link: "/ttd-piket",
    type: "piket_upload",
    piketId: event.params.piketId,
  });
});

/**
 * Trigger: When piket is verified
 * Send notification to the reporter (userPiket)
 */
exports.onPiketVerified = onDocumentUpdated("piket/{piketId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after || before.verification === after.verification || !after.verification) {
    return;
  }

  if (!after.userPiket) return;

  const reporterId = typeof after.userPiket === 'string'
    ? after.userPiket
    : (after.userPiket.id || after.userPiket.path?.split('/').pop());

  if (!reporterId) return;

  const title = "Laporan Piket Diverifikasi";
  const body = `Laporan piket Anda di ${after.place || "Asrama"} telah diverifikasi.`;

  await sendNotification(reporterId, title, body, {
    link: "/history",
    type: "piket_verification",
    piketId: event.params.piketId,
  });
});

/**
 * Trigger: When catatan piket is created (piket rejected)
 * Send notification to the student on duty (userPiket), NOT to supervisor (laporTo)
 */
exports.onCatatanPiketCreated = onDocumentCreated("catatanPiket/{catatanId}", async (event) => {
  const data = event.data.data();
  if (!data) return;

  // Extract userPiket ID (the student who submitted the piket report)
  let targetUserId = null;

  if (data.userPiketId) {
    targetUserId = data.userPiketId;
  } else if (data.userPiket) {
    if (typeof data.userPiket === 'string') {
      targetUserId = data.userPiket.replace(/^\/?users\//, '');
    } else {
      targetUserId = data.userPiket.id || data.userPiket.path?.split('/').pop();
    }
  }

  // Fallback: If not found directly in catatanPiket, read from original piket document
  if (!targetUserId && data.reportId) {
    try {
      const piketDoc = await db.collection("piket").doc(data.reportId).get();
      if (piketDoc.exists) {
        const piketData = piketDoc.data();
        if (piketData.userPiket) {
          targetUserId = typeof piketData.userPiket === 'string'
            ? piketData.userPiket.replace(/^\/?users\//, '')
            : (piketData.userPiket.id || piketData.userPiket.path?.split('/').pop());
        }
      }
    } catch (e) {
      console.error("Error fetching piketDoc in onCatatanPiketCreated:", e);
    }
  }

  if (!targetUserId) {
    console.log("No valid userPiket found for rejection notification:", event.params.catatanId);
    return;
  }

  const title = "Piket Ditolak ⚠️";
  const body = `Laporan piket Anda ditolak: "${data.catatan || "Tidak memenuhi kriteria"}"`;

  await sendNotification(targetUserId, title, body, {
    link: "/history",
    type: "piket_rejected",
    catatanId: event.params.catatanId,
  });
});

/**
 * Trigger: When jamal report is verified
 * Send notification to all members on duty (usertoJamal array)
 */
exports.onJamalVerified = onDocumentUpdated("jamal/{jamalId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after || before.verification === after.verification || !after.verification) {
    return;
  }

  const teamRefs = after.usertoJamal || [];
  const userIds = teamRefs.map(ref =>
    typeof ref === 'string' ? ref : (ref.id || ref.path?.split('/').pop())
  ).filter(Boolean);

  if (userIds.length === 0) return;

  const title = "Laporan Jam Malam Diverifikasi";
  const body = "Laporan jam malam tugas Anda telah diverifikasi oleh Kepenghunian.";

  await Promise.all(
    userIds.map(userId => sendNotification(userId, title, body, {
      link: "/history",
      type: "jamal_verification",
      jamalId: event.params.jamalId,
    }))
  );
});

/**
 * Trigger: When SPA payment form is submitted
 * Send notification to Bendahara (userWhoReport)
 */
exports.onSpaUpload = onDocumentCreated("Spa/{spaId}", async (event) => {
  const spa = event.data.data();
  if (!spa || spa.tipe !== "form" || !spa.userWhoReport) return;

  const bendaharaId = typeof spa.userWhoReport === 'string'
    ? spa.userWhoReport
    : (spa.userWhoReport.id || spa.userWhoReport.path?.split('/').pop());

  if (!bendaharaId) return;

  const title = "Pembayaran SPA Baru";
  const body = `Ada bukti pembayaran SPA baru untuk bulan ${spa.bulan || ""} yang perlu diverifikasi.`;

  await sendNotification(bendaharaId, title, body, {
    link: "/accepting-spa",
    type: "spa_upload",
    spaId: event.params.spaId,
  });
});

/**
 * Trigger: When SPA payment is verified
 * Send notification to the submitter (author)
 */
exports.onSpaVerified = onDocumentUpdated("Spa/{spaId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after || before.verification === after.verification || !after.verification || after.tipe !== "form") {
    return;
  }

  if (!after.author) return;

  const authorId = typeof after.author === 'string'
    ? after.author
    : (after.author.id || after.author.path?.split('/').pop());

  if (!authorId) return;

  const title = "Pembayaran SPA Diverifikasi";
  const body = `Bukti pembayaran SPA Anda untuk bulan ${after.bulan || ""} telah diverifikasi.`;

  await sendNotification(authorId, title, body, {
    link: "/history",
    type: "spa_verification",
    spaId: event.params.spaId,
  });
});

/**
 * Trigger: When a historyPoint document is created
 * Send notification to the user receiving points (userref)
 */
exports.onPointJudgment = onDocumentCreated("historyPoint/{pointId}", async (event) => {
  const pointData = event.data.data();
  if (!pointData || !pointData.userref) return;

  const targetUserId = typeof pointData.userref === 'string'
    ? pointData.userref
    : (pointData.userref.id || pointData.userref.path?.split('/').pop());

  if (!targetUserId) return;

  const delta = pointData.point || 0;
  const actionLabel = delta < 0 ? "Pengurangan" : "Penambahan";

  const title = `Perubahan Poin: ${pointData.name || "Transaksi Poin"}`;
  const body = `Ada ${actionLabel.toLowerCase()} sebesar ${delta < 0 ? delta : '+' + delta} poin pada akun Anda.`;

  await sendNotification(targetUserId, title, body, {
    link: "/history",
    type: "point_judgment",
    pointId: event.params.pointId,
    value: delta,
  });
});

/**
 * HTTP Endpoint: Test send notification
 */
exports.sendNotificationTest = onRequest(async (request, response) => {
  try {
    const { userId, title, body, data } = request.body;

    if (!userId || !title || !body) {
      response.status(400).json({
        error: "userId, title, and body are required",
      });
      return;
    }

    const result = await sendNotification(userId, title, body, data);

    response.json({
      success: result,
      message: result ? "Notification sent" : "Failed to send notification",
    });
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ error: error.message });
  }
});

/**
 * HTTP Endpoint: Send notification to multiple users
 */
exports.sendBulkNotification = onRequest(async (request, response) => {
  try {
    const { userIds, title, body, data } = request.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      response.status(400).json({
        error: "userIds (array), title, and body are required",
      });
      return;
    }

    const results = await Promise.all(
        userIds.map((userId) => sendNotification(userId, title, body, data))
    );

    const successCount = results.filter((r) => r).length;

    response.json({
      success: true,
      totalUsers: userIds.length,
      successCount: successCount,
      failedCount: userIds.length - successCount,
    });
  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ error: error.message });
  }
});

/**
 * Trigger: When absenMalam is uploaded
 * Send notification to Ketua, Wakil Ketua, or Kepenghunian
 */
exports.onAbsenMalamUpload = onDocumentCreated("absenMalam/{absenMalamId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.user) return;

  const submitterId = typeof data.user === 'string'
    ? data.user
    : (data.user.id || data.user.path?.split('/').pop());

  if (!submitterId) return;

  try {
    // Get submitter name
    const submitterDoc = await db.collection("users").doc(submitterId).get();
    const submitterName = submitterDoc.exists ? (submitterDoc.data().username || "Seorang penghuni") : "Seorang penghuni";

    // Query admin users with relevant roles
    const adminSnap = await db.collection("users")
      .where("jabatan", "in", ["ketua", "wakil ketua", "kepenghunian"])
      .get();

    const adminIds = [];
    adminSnap.forEach(doc => {
      adminIds.push(doc.id);
    });

    if (adminIds.length === 0) return;

    const title = "Absen Malam Baru";
    const body = `${submitterName} telah mengirimkan absen malam. Silakan verifikasi.`;

    await Promise.all(
      adminIds.map(adminId => sendNotification(adminId, title, body, {
        link: "/verification-absen-malam",
        type: "absen_malam_upload",
        absenMalamId: event.params.absenMalamId
      }))
    );
  } catch (error) {
    console.error("Error sending onAbsenMalamUpload notifications:", error);
  }
});

/**
 * Trigger: When absenMalam is verified
 * Send notification to the submitter (user)
 */
exports.onAbsenMalamVerified = onDocumentUpdated("absenMalam/{absenMalamId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after || before.verification === after.verification || !after.verification) {
    return;
  }

  if (!after.user) return;

  const reporterId = typeof after.user === 'string'
    ? after.user
    : (after.user.id || after.user.path?.split('/').pop());

  if (!reporterId) return;

  const title = "Absen Malam Diverifikasi";
  const body = "Absen malam Anda telah diverifikasi oleh admin.";

  await sendNotification(reporterId, title, body, {
    link: "/home",
    type: "absen_malam_verification",
    absenMalamId: event.params.absenMalamId,
  });
});

