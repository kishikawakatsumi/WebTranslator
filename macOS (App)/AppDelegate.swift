import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
  private var loginWindow: NSWindow?

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    return true
  }

  func application(_ application: NSApplication, open urls: [URL]) {
    for url in urls {
      guard url.scheme == "webtranslator", url.host == "login" else {
        continue
      }
      presentLoginWindow()
    }
  }

  private func presentLoginWindow() {
    if let window = loginWindow {
      window.makeKeyAndOrderFront(nil)
      NSApp.activate(ignoringOtherApps: true)
      return
    }

    let loginVC = LoginViewController()
    loginVC.onFinish = { [weak self] in
      self?.loginWindow?.close()
      self?.loginWindow = nil
      self?.returnToSafari()
    }

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 900, height: 640),
      styleMask: [.titled, .closable, .resizable, .miniaturizable],
      backing: .buffered,
      defer: false
    )
    window.title = "DeepL Login"
    window.contentViewController = loginVC
    window.center()
    window.isReleasedWhenClosed = false
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    loginWindow = window
  }

  private func returnToSafari() {
    if let safari = NSRunningApplication.runningApplications(
      withBundleIdentifier: "com.apple.Safari"
    ).first {
      safari.activate(options: [.activateIgnoringOtherApps])
    }
  }
}
