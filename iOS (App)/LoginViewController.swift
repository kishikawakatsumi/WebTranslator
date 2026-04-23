import UIKit
import WebKit

final class LoginViewController: UIViewController, WKNavigationDelegate {
  private let loginURL = URL(string: "https://www.deepl.com/login")!
  private var webView: WKWebView!
  private var urlLabel: UILabel!
  private var errorView: UIStackView!
  private var errorDetailLabel: UILabel!
  private var didCaptureSession = false

  var onFinish: (() -> Void)?
  var returnToSafariOnFinish = false

  override func viewDidLoad() {
    super.viewDidLoad()

    view.backgroundColor = .systemBackground

    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()

    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.translatesAutoresizingMaskIntoConstraints = false
    webView.navigationDelegate = self
    view.addSubview(webView)
    self.webView = webView

    NSLayoutConstraint.activate([
      webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    ])

    setupErrorView()
    setupNavigationItem()

    webView.load(URLRequest(url: loginURL))
  }

  private func setupNavigationItem() {
    let titleStack = UIStackView()
    titleStack.axis = .vertical
    titleStack.alignment = .center
    titleStack.spacing = 0

    let titleLabel = UILabel()
    titleLabel.text = "DeepL Login"
    titleLabel.font = .systemFont(ofSize: 15, weight: .semibold)
    titleLabel.textColor = .label

    let urlLabel = UILabel()
    urlLabel.text = loginURL.absoluteString
    urlLabel.font = .systemFont(ofSize: 11, weight: .regular)
    urlLabel.textColor = .secondaryLabel
    urlLabel.lineBreakMode = .byTruncatingMiddle

    titleStack.addArrangedSubview(titleLabel)
    titleStack.addArrangedSubview(urlLabel)

    navigationItem.titleView = titleStack
    self.urlLabel = urlLabel

    navigationItem.leftBarButtonItem = UIBarButtonItem(
      barButtonSystemItem: .cancel,
      target: self,
      action: #selector(cancelTapped)
    )
  }

  private func setupErrorView() {
    let stack = UIStackView()
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    stack.isHidden = true

    let icon = UIImageView(
      image: UIImage(systemName: "wifi.exclamationmark")
    )
    icon.tintColor = .systemGray
    icon.contentMode = .scaleAspectFit
    icon.preferredSymbolConfiguration = .init(pointSize: 44, weight: .regular)
    stack.addArrangedSubview(icon)

    let titleLabel = UILabel()
    titleLabel.text = "Couldn't load the sign-in page"
    titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 0
    stack.addArrangedSubview(titleLabel)

    let detailLabel = UILabel()
    detailLabel.font = .systemFont(ofSize: 13, weight: .regular)
    detailLabel.textColor = .secondaryLabel
    detailLabel.textAlignment = .center
    detailLabel.numberOfLines = 0
    stack.addArrangedSubview(detailLabel)
    self.errorDetailLabel = detailLabel

    stack.setCustomSpacing(20, after: detailLabel)

    let retryButton = UIButton(type: .system)
    retryButton.setTitle("Retry", for: .normal)
    retryButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    retryButton.addTarget(
      self,
      action: #selector(retryTapped),
      for: .touchUpInside
    )
    stack.addArrangedSubview(retryButton)

    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      stack.leadingAnchor.constraint(
        equalTo: view.layoutMarginsGuide.leadingAnchor,
        constant: 16
      ),
      stack.trailingAnchor.constraint(
        equalTo: view.layoutMarginsGuide.trailingAnchor,
        constant: -16
      ),
    ])
    self.errorView = stack
  }

  @objc private func cancelTapped() {
    onFinish?()
  }

  @objc private func retryTapped() {
    errorView.isHidden = true
    webView.isHidden = false
    webView.load(URLRequest(url: loginURL))
  }

  func webView(
    _ webView: WKWebView,
    didStartProvisionalNavigation navigation: WKNavigation!
  ) {
    updateURLLabel()
  }

  func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    updateURLLabel()
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    updateURLLabel()
    captureSessionIfReady()
  }

  func webView(
    _ webView: WKWebView,
    didFail navigation: WKNavigation!,
    withError error: Error
  ) {
    presentError(error)
  }

  func webView(
    _ webView: WKWebView,
    didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    presentError(error)
  }

  private func presentError(_ error: Error) {
    let nsError = error as NSError

    if nsError.domain == NSURLErrorDomain,
       nsError.code == NSURLErrorCancelled {
      return
    }
    errorDetailLabel.text = error.localizedDescription
    errorView.isHidden = false
    webView.isHidden = true
  }

  private func updateURLLabel() {
    guard let urlLabel else { return }
    urlLabel.text = webView.url?.absoluteString ?? loginURL.absoluteString
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
          if self.returnToSafariOnFinish {
            self.returnToSafari()
          }
        }
      }
    }
  }

  private func returnToSafari() {
    activateSafari()
  }
}
