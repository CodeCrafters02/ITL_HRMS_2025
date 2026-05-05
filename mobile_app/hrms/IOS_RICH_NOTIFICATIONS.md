# iOS Rich Notification Setup Guide

To enable images in notifications when the app is in the **background** or **terminated**, you must add a **Notification Service Extension** to your Xcode project.

## Step 1: Add the Extension Target in Xcode

1.  Open `ios/Runner.xcworkspace` in Xcode.
2.  Go to **File > New > Target...**
3.  Search for **Notification Service Extension** and click **Next**.
4.  Enter a name (e.g., `NotificationServiceExtension`).
5.  Ensure **Project** is `Runner` and **Embed in Application** is `Runner`.
6.  Click **Finish**.
7.  If Xcode asks to "Activate 'NotificationServiceExtension' scheme?", click **Activate**.

## Step 2: Configure the Extension

1.  In the project navigator, you will see a new folder named `NotificationServiceExtension`.
2.  Open `NotificationService.swift` inside that folder.
3.  Replace the entire content with the following code:

```swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        if let bestAttemptContent = bestAttemptContent {
            // Check for image URL in the payload
            // FCM sends image URL in 'fcm_options' or 'data'
            let userInfo = request.content.userInfo
            var imageURLString: String? = nil
            
            if let fcmOptions = userInfo["fcm_options"] as? [String: Any] {
                imageURLString = fcmOptions["image"] as? String
            }
            
            if imageURLString == nil {
                imageURLString = userInfo["image"] as? String ?? userInfo["imageUrl"] as? String
            }
            
            guard let urlString = imageURLString, let fileURL = URL(string: urlString) else {
                contentHandler(bestAttemptContent)
                return
            }
            
            // Download the image
            let task = URLSession.shared.downloadTask(with: fileURL) { (location, response, error) in
                if let location = location {
                    let tmpDirectory = FileManager.default.temporaryDirectory
                    let tmpFile = "tmp.\(fileURL.pathExtension)"
                    let tmpURL = tmpDirectory.appendingPathComponent(tmpFile)
                    
                    try? FileManager.default.removeItem(at: tmpURL)
                    try? FileManager.default.moveItem(at: location, to: tmpURL)
                    
                    if let attachment = try? UNNotificationAttachment(identifier: "", url: tmpURL, options: nil) {
                        bestAttemptContent.attachments = [attachment]
                    }
                }
                contentHandler(bestAttemptContent)
            }
            task.resume()
        }
    }
    
    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent =  bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
```

## Step 3: Deployment Target
Ensure the **Minimum Deployments** for the new `NotificationServiceExtension` target matches your main `Runner` target (usually iOS 12.0 or higher).

## Step 4: Signing
Make sure to set the **Team** and **Bundle Identifier** for the new target. The Bundle Identifier should be `your.app.bundle.id.NotificationServiceExtension`.

---
**Note:** For Android, images will now work automatically for foreground notifications, and should work for background notifications if sent correctly from the backend.
