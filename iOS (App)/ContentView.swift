import SwiftUI

private struct SignInButtonWidthKey: PreferenceKey {
  static var defaultValue: CGFloat = 300
  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
    value = nextValue()
  }
}

struct ContentView: View {
  let reloadToken: Int
  var onSignInTapped: () -> Void
  @State private var sessionInfo: SessionInfo?
  @State private var signInButtonWidth: CGFloat = 300
  @State private var isRefreshingSession = false
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    ScrollView {
      VStack(alignment: .center, spacing: 0) {
        Text("Enable Web Translator Safari Web Extension")
          .font(.title2)
          .bold()
          .padding(.horizontal, 8)
        Color.clear
          .frame(height: 16)

        Text("You need to enable Safari extensions in order to start using Web Translator for DeepL")
        Color.clear
          .frame(height: 16)

        VStack(alignment: .leading, spacing: 8) {
          ItemView(
            bulletImage: "safari",
            text: #"Open "Safari" and visit any website"#,
            additionalImage: nil
          )
          ItemView(
            bulletImage: "textformat.size",
            text: #"Tap the aA button in the address bar"#,
            additionalImage: "addressbar"
          )
          ItemView(
            bulletImage: "puzzlepiece.extension",
            text: #"Tap the "Manage Extensions" section"#,
            additionalImage: "manageextensions"
          )
          ItemView(
            bulletImage: "switch.2",
            text: #"Enable Web Translator and then tap "Done"#,
            additionalImage: nil
          )
          ItemView(
            bulletImage: "hand.tap",
            text: #"Tap Web Translator for DeepL"#,
            additionalImage: nil
          )
          ItemView(
            bulletImage: "checkmark.shield",
            text: #"Tap "Always Allow" then "Always Allow on Every Website""#,
            additionalImage: nil
          )
          ItemView(
            bulletImage: "arrow.clockwise",
            text: #"Lastly, renew the page"#,
            additionalImage: nil
          )
        }
        .font(.body)
        .frame(
          maxWidth: 300
        )
        .padding()

        Button {
          onSignInTapped()
        } label: {
          Text("Sign in to DeepL")
            .fontWeight(.semibold)
            .frame(maxWidth: 300)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .background(
          GeometryReader { proxy in
            Color.clear
              .preference(
                key: SignInButtonWidthKey.self,
                value: proxy.size.width
              )
          }
        )
        .onPreferenceChange(SignInButtonWidthKey.self) { width in
          signInButtonWidth = width
        }

        if let info = sessionInfo {
          Color.clear
            .frame(height: 16)
          SessionInfoCard(
            info: info,
            isRefreshing: isRefreshingSession,
            onRefresh: refreshSessionTapped
          )
          .frame(width: signInButtonWidth)
        }
      }
      .frame(
        maxWidth: 560
      )
      .padding()
    }
    .onAppear {
      sessionInfo = loadSessionInfo()
    }
    .onChange(of: reloadToken) { _ in
      sessionInfo = loadSessionInfo()
    }
    .onChange(of: scenePhase) { newPhase in
      if newPhase == .active {
        sessionInfo = loadSessionInfo()
      }
    }
  }

  private func refreshSessionTapped() {
    guard !isRefreshingSession else { return }
    isRefreshingSession = true
    refreshSession { result in
      isRefreshingSession = false
      if case .success = result {
        sessionInfo = loadSessionInfo()
      }
    }
  }
}

struct SessionInfoCard: View {
  let info: SessionInfo
  let isRefreshing: Bool
  var onRefresh: () -> Void

  private var expiryLine: String {
    let formatted = info.accessTokenExpiresAt.formatted(
      .dateTime
        .month(.defaultDigits)
        .day(.defaultDigits)
        .hour(.twoDigits(amPM: .omitted))
        .minute(.twoDigits)
    )
    return "Session expires \(formatted)"
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        Image(systemName: "checkmark.seal.fill")
          .foregroundStyle(.green)
        Text("Signed in")
          .fontWeight(.semibold)
        Spacer()
        Button(action: onRefresh) {
          Group {
            if isRefreshing {
              ProgressView()
            } else {
              Image(systemName: "arrow.clockwise")
            }
          }
          .font(.footnote)
          .foregroundStyle(.secondary)
          .frame(width: 18, height: 18)
        }
        .buttonStyle(.plain)
        .disabled(isRefreshing)
      }
      Text(info.email)
        .font(.subheadline)
        .foregroundStyle(.secondary)
      Text(expiryLine)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(UIColor.secondarySystemBackground))
    )
  }
}

struct ItemView: View {
  let bulletImage: String
  let text: String
  let additionalImage: String?

  var body: some View {
    HStack(alignment: .top) {
      Image(systemName: bulletImage)
        .resizable()
        .scaledToFit()
        .frame(width: 20, height: 20)
      Text(text)
    }
    if let additionalImage {
      Image(additionalImage)
        .resizable()
        .scaledToFit()
        .frame(maxWidth: 300)
        .border(Color.gray, width: 0.5)
    }
    Color.clear
      .frame(height: 12)
  }
}

struct ContentView_Previews: PreviewProvider {
  static var previews: some View {
    ContentView(reloadToken: 0, onSignInTapped: {})
  }
}
