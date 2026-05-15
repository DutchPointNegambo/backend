import multer from 'multer';

// Configuration
const CLOUD_NAME = 'dtdgufs9u';
const UPLOAD_PRESET = 'hotel_main';

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Increased to 10MB
});

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('Backend proxying upload using native fetch:', req.file.originalname);

    // Create FormData
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('upload_preset', UPLOAD_PRESET);

    // Upload to Cloudinary using native Fetch (Node 18+)
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary API Error:', data);
      return res.status(response.status).json({ 
        success: false, 
        message: data.error?.message || 'Cloudinary upload failed' 
      });
    }

    console.log('Upload success via native fetch');

    res.status(200).json({
      success: true,
      url: data.secure_url
    });
  } catch (error) {
    console.error('Fetch Proxy Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Network Error: ' + error.message 
    });
  }
};

export const uploadMiddleware = upload.single('file');
