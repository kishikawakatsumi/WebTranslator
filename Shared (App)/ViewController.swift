import WebKit

import Cocoa
import SafariServices

let extensionBundleIdentifier = "com.kishikawakatsumi.WebTranslator.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {
  @IBOutlet var webView: WKWebView!

  override func viewDidLoad() {
    super.viewDidLoad()
    print("viewDidLoad")

    self.webView.navigationDelegate = self
    self.webView.configuration.userContentController.add(self, name: "controller")
    self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    webView.evaluateJavaScript("show('mac')")

    SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
      guard let state = state, error == nil else {
        return
      }

      DispatchQueue.main.async {
        webView.evaluateJavaScript("show('mac', \(state.isEnabled))")
      }
    }
  }

  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    if (message.body as! String != "open-preferences") {
      return;
    }

    SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
      guard error == nil else {
        return
      }
      DispatchQueue.main.async {
        NSApplication.shared.terminate(nil)
      }
    }
  }
}
