import api from './api';
import s3UploadService from './s3UploadService';

export const leadershipService = {
  /**
   * Fetch MLA profile and real-time telemetry metrics
   */
  async getMlaProfile() {
    return api.get('/leadership/mla');
  },

  /**
   * Update MLA photo URL directly
   */
  async updateMlaPhotoUrl(photoUrl) {
    return api.patch('/admins/leadership/mla/photo', { photoUrl });
  },

  /**
   * Upload MLA photo file to S3 via Presigned URL with verification and update profile
   */
  async uploadMlaPhoto(file) {
    // 1. Get presigned upload URL for leadership photo
    const presignData = await s3UploadService.getPresignedUploadUrl({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category: 'mla_leadership_photo',
      module: 'leadership',
    });

    // 2. Direct HTTP PUT to AWS S3
    await s3UploadService.uploadDirectToS3(
      presignData.uploadUrl,
      file,
      presignData.fileType || file.type
    );

    // 3. Confirm with Backend HeadObject verification & DB update
    const confirmResult = await s3UploadService.confirmUpload({
      key: presignData.key,
      fileName: file.name,
      fileType: presignData.fileType || file.type,
      fileSize: file.size,
      category: 'mla_leadership_photo',
    });

    const photoUrl = confirmResult?.fileUrl || presignData.fileUrl;
    return {
      success: true,
      data: {
        photoUrl,
        key: presignData.key,
      },
    };
  },

  /**
   * Update MLA profile details
   */
  async updateMlaProfile(profileData) {
    return api.put('/admins/leadership/mla', profileData);
  },
};

export default leadershipService;
