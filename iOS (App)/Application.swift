import SwiftUI

@main
struct Application: App {
  @State private var pendingLogin: LoginRequest?

  var body: some Scene {
    WindowGroup {
      ContentView(
        onSignInTapped: {
          pendingLogin = LoginRequest(returnToSafari: false)
        }
      )
      .onOpenURL { url in
        handle(url: url)
      }
      .onContinueUserActivity("NSUserActivityTypeBrowsingWeb") { activity in
        if let url = activity.webpageURL {
          handle(url: url)
        }
      }
      .sheet(item: $pendingLogin) { request in
        LoginScreen(returnToSafariOnFinish: request.returnToSafari) {
          pendingLogin = nil
        }
        .ignoresSafeArea(edges: .bottom)
      }
    }
  }

  private func handle(url: URL) {
    guard
      url.host == "webtranslator.kishikawakatsumi.com",
      url.path == "/webtranslator/login"
    else {
      return
    }
    pendingLogin = LoginRequest(returnToSafari: true)
  }
}

private struct LoginRequest: Identifiable {
  let id = UUID()
  let returnToSafari: Bool
}

private struct LoginScreen: UIViewControllerRepresentable {
  let returnToSafariOnFinish: Bool
  let onFinish: () -> Void

  func makeUIViewController(context: Context) -> UIViewController {
    let viewController = LoginViewController()
    viewController.onFinish = onFinish
    viewController.returnToSafariOnFinish = returnToSafariOnFinish
    let navigationController = UINavigationController(rootViewController: viewController)
    navigationController.navigationBar.prefersLargeTitles = false
    return navigationController
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
