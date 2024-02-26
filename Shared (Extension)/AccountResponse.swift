import Foundation

struct AccountResponse: Codable {
  var result: Result

  struct Result: Codable {
    var featureSet: FeatureSet?
    var loginState: LoginState?
  }

  struct FeatureSet: Codable {
    var translator: Translator?
  }

  struct Translator: Codable {
    var service: String?
  }

  struct LoginState: Codable {
    var accountId: String?
    var ssoIdentityProviderName: String?
    var ssoIdentityProviderId: String?
  }
}
