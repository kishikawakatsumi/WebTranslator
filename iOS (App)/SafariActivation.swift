import UIKit

/// Bring Safari to the foreground without disturbing its active tab.
/// Uses `LSApplicationWorkspace` (a private API).
func activateSafari() {
  let defaultWorkspaceSelector = NSSelectorFromString("defaultWorkspace")
  let openApplicationSelector = NSSelectorFromString(
    "openApplicationWithBundleID:"
  )
  guard
    let workspaceClass = NSClassFromString("LSApplicationWorkspace"),
    let workspace = (workspaceClass as AnyObject)
      .perform(defaultWorkspaceSelector)?
      .takeUnretainedValue()
  else {
    return
  }
  _ = (workspace as AnyObject).perform(
    openApplicationSelector,
    with: "com.apple.mobilesafari"
  )
}
