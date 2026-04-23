import Cocoa
import WebKit

final class LoginViewController: NSViewController, WKNavigationDelegate {
  private let loginURL = URL(string: "https://www.deepl.com/login")!
  private var webView: WKWebView!
  private var didCaptureSession = false

  var onFinish: (() -> Void)?

  override func loadView() {
    view = NSView(frame: NSRect(x: 0, y: 0, width: 900, height: 640))
  }

  override func viewDidLoad() {
    super.viewDidLoad()

    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()

    let webView = WKWebView(frame: view.bounds, configuration: configuration)
    webView.autoresizingMask = [.width, .height]
    webView.navigationDelegate = self
    view.addSubview(webView)
    self.webView = webView

    webView.load(URLRequest(url: loginURL))
  }

  override func viewDidAppear() {
    super.viewDidAppear()
    view.window?.makeFirstResponder(webView)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    captureSessionIfReady()
  }

  private func captureSessionIfReady() {
    guard !didCaptureSession else { return }

    let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
    cookieStore.getAllCookies { [weak self] cookies in
      guard let self = self else { return }

      let deeplCookies = cookies.filter { $0.domain.hasSuffix("deepl.com") }
      guard deeplCookies.contains(where: { $0.name == "dl_access" }) else {
        return
      }

      self.didCaptureSession = true

      let cookieHeader = deeplCookies
        .map { "\($0.name)=\($0.value)" }
        .joined(separator: ";") + ";"

      self.webView.evaluateJavaScript("navigator.userAgent") { result, _ in
        let userAgent = (result as? String) ?? ""

        var item: [String: String] = ["session": cookieHeader]
        if !userAgent.isEmpty {
          item["userAgent"] = userAgent
        }

        Credentials().update(item)
        DispatchQueue.main.async {
          self.onFinish?()
        }
      }
    }
  }
}
