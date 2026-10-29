import { PermissionsAndroid, Permission, Platform } from 'react-native';
import { storage } from './storage/storage';

const INITIAL_PERMISSIONS_STORAGE_KEY = '@arogya_initial_permissions_requested_v1';

/**
 * Service to manage upfront app runtime permissions upon first app install/open.
 */
class PermissionService {
  /**
   * Checks if initial permissions were already requested upon first launch.
   * If not requested yet, asks the user for all required app permissions:
   * - Camera
   * - Location (Fine & Coarse)
   * - Notifications (Android 13+)
   * - Media/Storage
   */
  async requestInitialAppPermissions(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const alreadyRequested = await storage.getItem<boolean>(INITIAL_PERMISSIONS_STORAGE_KEY);
      if (alreadyRequested) {
        return;
      }

      const permissionsToRequest: Permission[] = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const androidVersion = typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(String(Platform.Version), 10);

      // Android 13+ (API 33+) requires runtime POST_NOTIFICATIONS and READ_MEDIA_IMAGES
      if (androidVersion >= 33) {
        if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        }
      } else {
        if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
      }

      console.log('[PermissionService] Requesting initial app permissions:', permissionsToRequest);
      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      console.log('[PermissionService] Initial permission results:', results);

      // Mark as requested in storage so we don't bombard user on subsequent opens
      await storage.setItem(INITIAL_PERMISSIONS_STORAGE_KEY, true);
    } catch (error) {
      console.warn('[PermissionService] Error requesting initial app permissions:', error);
    }
  }

  /**
   * Resets the initial permissions requested flag (useful for testing or full reset).
   */
  async resetInitialPermissionsFlag(): Promise<void> {
    try {
      await storage.removeItem(INITIAL_PERMISSIONS_STORAGE_KEY);
    } catch (error) {
      console.warn('[PermissionService] Error resetting permissions flag:', error);
    }
  }
}

export const permissionService = new PermissionService();
