import SwiftUI

struct ContentView: View {
  var body: some View {
    ScrollView {
      VStack {
        Text("Enable WebTranslator Safri Web Extension")
          .font(.title2)
          .bold()
          .padding()
        Text("You need to enable Safari extensions in order to start using WebTranslator for DeepL")
          .padding(.vertical, 2)

        VStack(alignment: .leading, spacing: 16) {
          HStack(alignment: .top) {
            Image(systemName: "safari")
              .resizable()
              .frame(width: 20, height: 20)
            Text(#"Open "Safari" and visit any website"#)
          }
          HStack(alignment: .top) {
            Image(systemName: "textformat.size")
              .resizable()
              .scaledToFit()
              .frame(width: 20, height: 20)
            Text(#"Tap the aA button in the address bar"#)
          }
          Image("addressbar")
            .resizable()
            .scaledToFit()
            .frame(maxWidth: 300)
            .border(Color.gray, width: 0.5)
          HStack(alignment: .top) {
            Image(systemName: "puzzlepiece.extension")
              .resizable()
              .scaledToFit()
              .frame(width: 20, height: 20)
            Text(#"Tap the "Manage Extensions" section"#)
          }
          Image("manageextensions")
            .resizable()
            .scaledToFit()
            .frame(maxWidth: 300)
            .border(Color.gray, width: 0.5)
          HStack(alignment: .top) {
            Image(systemName: "switch.2")
              .resizable()
              .frame(width: 20, height: 20)
            Text(#"Enable WebTranslator and then tap "Done"#)
          }
          HStack(alignment: .top) {
            Image(systemName: "hand.tap")
              .resizable()
              .scaledToFit()
              .frame(width: 20, height: 20)
            Text(#"Tap WebTranslator for DeepL"#)
          }
          HStack(alignment: .top) {
            Image(systemName: "checkmark.shield")
              .resizable()
              .scaledToFit()
              .frame(width: 20, height: 20)
            Text(#"Tap "Always Allow" then "Always Allow on Every Website""#)
          }
          HStack(alignment: .top) {
            Image(systemName: "arrow.clockwise")
              .resizable()
              .scaledToFit()
              .frame(width: 20, height: 20)
            Text(#"Lastly, renew the page"#)
          }
        }
        .font(.body)
        .frame(
          minWidth: 0,
          maxWidth: .infinity,
          minHeight: 0,
          maxHeight: .infinity,
          alignment: .topLeading
        )
        .padding()
      }
      .padding()
    }
  }
}

struct ContentView_Previews: PreviewProvider {
  static var previews: some View {
    ContentView()
  }
}

