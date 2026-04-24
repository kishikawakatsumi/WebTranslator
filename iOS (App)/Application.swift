import SwiftUI

@main
struct Application: App {
  @State private var isPresentingLogin = false
  @State private var reloadToken = 0

  var body: some Scene {
    WindowGroup {
      ContentView(
        reloadToken: reloadToken,
        onSignInTapped: { isPresentingLogin = true }
      )
      .onOpenURL { url in
        handle(url: url)
      }
      .onContinueUserActivity("NSUserActivityTypeBrowsingWeb") { activity in
        if let url = activity.webpageURL {
          handle(url: url)
        }
      }
      .sheet(
        isPresented: $isPresentingLogin,
        onDismiss: { reloadToken += 1 }
      ) {
        LoginScreen { isPresentingLogin = false }
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
    isPresentingLogin = true
  }
}

private struct LoginScreen: UIViewControllerRepresentable {
  let onFinish: () -> Void

  func makeUIViewController(context: Context) -> UIViewController {
    let viewController = LoginViewController()
    viewController.onFinish = onFinish
    let navigationController = UINavigationController(rootViewController: viewController)
    navigationController.navigationBar.prefersLargeTitles = false
    return navigationController
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
