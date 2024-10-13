import SwiftUI

struct ContentView: View {
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
      }
      .frame(
        maxWidth: 560
      )
      .padding()
    }
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
    ContentView()
  }
}
