import Foundation

struct LoginResponse: Codable {
  var result: Result

  struct Result: Codable {
    var id: String?
    var uid: String?
    var isAdministrator: Bool?
    var ssoIdentityProviderForMigration: String?
    var name: String?
    var email: String?
    var token: String
    var timeout: Int?
    var accessTokenExpiresIn: Int?
  }
}
