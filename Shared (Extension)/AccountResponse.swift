import Foundation

struct AccountResponse: Codable {
  var result: Result

  struct Result: Codable {
    var account: Account
  }

  struct Account: Codable {
    var id: String?
    var email: String?
    var token: String?
    var name: String?
    var accountStatus: Int?
    var isAccountEligibleForFreeTrial: Bool?
    var timeout: Int?
  }
}
