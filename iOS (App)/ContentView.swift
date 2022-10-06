import SwiftUI

struct ContentView: View {
  var body: some View {
    VStack {
      Text("Enable WebTranslator Web Extension")
        .font(.title)
      VStack(alignment: .leading, spacing: 16) {
        Text("You need to enable Safari extensions in order to start using WebTranslator for DeepL")
        HStack {
          Image("safari")
            .resizable()
            .frame(width: 20, height: 20)
          Text(#"Open "Safari" and visit any website"#)
        }
        Text(#"Tap the aA button in the address bar"#)
        Image("addressbar")
        Text(#"Tap the "Manage Extensions" section"#)
        Image("manageextensions")
          .border(Color.gray, width: 0.5)
        Text(#"Enable WebTranslator and then tap "Done"#)
        Text(#"Tap WebTranslator"#)
        Text(#"Tap "Always Allow" then "Always Allow on Every Website""#)
        Text(#"Lastly, renew the page"#)
      }
      .font(.body)
      .padding()
    }
    .padding()
  }
}

struct ContentView_Previews: PreviewProvider {
  static var previews: some View {
    ContentView()
  }
}

