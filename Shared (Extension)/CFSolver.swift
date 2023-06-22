import Foundation
import WebKit

class CFSolver: NSObject, WKNavigationDelegate {
  private let webView: WKWebView
  private var timer: Timer?
  private var completionHandler: (Result<String, Error>) -> Void

  override init() {
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    self.webView = WKWebView(frame: .zero, configuration: configuration)
    completionHandler = { _ in }
  }

  deinit {
    if let timer = timer, timer.isValid {
      timer.invalidate()
    }
  }

  func solve(_ completionHandler: @escaping (Result<String, Error>) -> Void) {
    self.completionHandler = completionHandler

    webView.navigationDelegate = self
    webView.load(
      URLRequest(
        url: URL(
          string: "https://clearance.deepl.com/js?redirect_to=https%3A%2F%2Fw.deepl.com%2Fclearance%2Flogin"
        )!
      )
    )

    let timer = Timer(timeInterval: 300, repeats: false, block: { (timer) in
      completionHandler(.failure(URLError(.timedOut)))
      timer.invalidate()
    })
    RunLoop.current.add(timer, forMode: .common)
    self.timer = timer
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    let timer = self.timer
    let completionHandler = self.completionHandler

    webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { (cookies) in
      if (cookies.contains { $0.name == "cf_clearance" } && cookies.contains { $0.name == "dl_clearance" }) {
        let cookies = cookies.reduce("") { (partialResult, cookie) in
          partialResult + "\(cookie.name)=\(cookie.value);"
        }

        timer?.invalidate()
        completionHandler(.success(cookies))
      }
    }
  }
}
