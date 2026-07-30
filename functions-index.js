const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

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
 * Trigger: When evidence is uploaded
 * Send notification to reported user
 */
exports.onEvidenceUpload = functions.firestore
  .document("evidence/{evidenceId}")
  .onCreate(async (snap, context) => {
    const evidence = snap.data();
    const reportedUserId = evidence.reportedUser;
    const evidenceType = evidence.type; // piket, jamal, spa

    const typeLabel = {
      piket: "Piket",
      jamal: "Jamal",
      spa: "SPA",
    };

    const title = `Bukti ${typeLabel[evidenceType]} Baru`;
    const body = `Ada bukti ${typeLabel[evidenceType]} baru yang diupload untuk Anda. Silakan periksa.`;

    await sendNotification(reportedUserId, title, body, {
      link: `/history`,
      type: "evidence_upload",
      evidenceId: context.params.evidenceId,
    });
  });

/**
 * Trigger: When evidence status is updated (verified/rejected)
 * Send notification to reported user
 */
exports.onEvidenceVerified = functions.firestore
  .document("evidence/{evidenceId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed
    if (before.status === after.status) {
      return;
    }

    const reportedUserId = after.reportedUser;
    const newStatus = after.status;
    const evidenceType = after.type;

    const typeLabel = {
      piket: "Piket",
      jamal: "Jamal",
      spa: "SPA",
    };

    let title, body;

    if (newStatus === "verified") {
      title = `Bukti ${typeLabel[evidenceType]} Diverifikasi`;
      body = `Bukti ${typeLabel[evidenceType]} Anda telah diverifikasi oleh admin.`;
    } else if (newStatus === "rejected") {
      title = `Bukti ${typeLabel[evidenceType]} Ditolak`;
      body = `Bukti ${typeLabel[evidenceType]} Anda ditolak. Silakan upload kembali.`;
    } else {
      return;
    }

    await sendNotification(reportedUserId, title, body, {
      link: `/history`,
      type: "evidence_verification",
      status: newStatus,
      evidenceId: context.params.evidenceId,
    });
  });

/**
 * Trigger: When point judgment is created
 * Send notification to reported user
 */
exports.onPointJudgment = functions.firestore
  .document("point/{pointId}")
  .onCreate(async (snap, context) => {
    const point = snap.data();
    const reportedUserId = point.reportedUser;
    const pointValue = point.value;
    const pointType = point.type; // piket, jamal, spa

    const typeLabel = {
      piket: "Piket",
      jamal: "Jamal",
      spa: "SPA",
    };

    const title = `Penghakiman ${typeLabel[pointType]}`;
    const body = `Anda mendapat penghakiman ${pointValue} poin untuk ${typeLabel[pointType].toLowerCase()}.`;

    await sendNotification(reportedUserId, title, body, {
      link: `/see-points`,
      type: "point_judgment",
      pointId: context.params.pointId,
      value: pointValue,
    });
  });

/**
 * HTTP Endpoint: Test send notification
 * Usage: POST /sendNotificationTest with {userId, title, body, data}
 */
exports.sendNotificationTest = functions.https.onRequest(
  async (request, response) => {
    cors(request, response, async () => {
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
  }
);

/**
 * HTTP Endpoint: Send notification to multiple users
 * Usage: POST /sendBulkNotification with {userIds, title, body, data}
 */
exports.sendBulkNotification = functions.https.onRequest(
  async (request, response) => {
    cors(request, response, async () => {
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
  }
);
