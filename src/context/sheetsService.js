// Google Sheets Service
// Mengirim data verifikasi ke Google Sheets via Apps Script

export const logToGoogleSheets = async (data) => {
  try {
    const {
      type, // 'piket' | 'jamal' | 'spa' | 'poin'
      verificationData, // Object dengan data verifikasi
      verifierName, // Nama person yang melakukan verifikasi
      verifierId, // UID person yang melakukan verifikasi
      timestamp = new Date().toISOString()
    } = data;

    // Get the Apps Script deployment URL dari environment
    const appsScriptUrl = import.meta.env[`VITE_APPS_SCRIPT_${type.toUpperCase()}`];
    
    if (!appsScriptUrl) {
      console.warn(`Apps Script URL tidak ditemukan untuk tipe: ${type}`);
      return { success: false, error: 'Apps Script URL not configured' };
    }

    // Siapkan payload
    const payload = {
      type,
      verifierName,
      verifierId,
      timestamp,
      data: verificationData
    };

    // Kirim ke Apps Script
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script memerlukan ini
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`Data ${type} berhasil dikirim ke Google Sheets`);
    return { success: true, message: `Data ${type} tercatat di Google Sheets` };

  } catch (error) {
    console.error('Error logging to Google Sheets:', error);
    // Jangan throw error - ini adalah non-blocking operation
    return { success: false, error: error.message };
  }
};

// Helper untuk format data sesuai tipe
export const formatVerificationData = (type, rawData) => {
  switch (type) {
    case 'piket':
      return {
        place: rawData.place || '-',
        pelaporName: rawData.pelaporName || '-',
        pelaporAngkatan: rawData.pelaporAngkatan || '-',
        timestamp: rawData.timestamp || '-',
        description: rawData.description || '-',
        id: rawData.id || '-'
      };

    case 'jamal':
      return {
        timestamp: rawData.timestamp || '-',
        usersList: (rawData.usersList || []).map(u => `${u.name} (${u.angkatan})`).join(', ') || '-',
        description: rawData.description || '-',
        id: rawData.id || '-'
      };

    case 'spa':
      return {
        kategori: rawData.kategori || '-',
        deskripsi: rawData.deskripsi || '-',
        pengusulName: rawData.pengusulName || '-',
        statusPersetujuan: rawData.statusPersetujuan || '-',
        timestamp: rawData.timestamp || '-',
        id: rawData.id || '-'
      };

    case 'poin':
      return {
        selectedUsers: (rawData.selectedUsers || []).map(u => `${u.name} (${u.angkatan})`).join(', ') || '-',
        selectedPoints: (rawData.selectedPoints || []).map(p => `${p.name} (${p.point})`).join(', ') || '-',
        totalDelta: rawData.totalDelta || 0,
        timestamp: rawData.timestamp || '-',
        description: rawData.description || '-',
        id: rawData.id || '-'
      };

    default:
      return rawData;
  }
};
