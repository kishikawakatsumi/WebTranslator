import Foundation

struct AccountResponse: Codable {
  var result: Result

  struct Result: Codable {
    var featureSet: FeatureSet
  }

  struct FeatureSet: Codable {
    var translator: Translator?
  }

  struct Translator: Codable {
    var service: String?
  }
}
