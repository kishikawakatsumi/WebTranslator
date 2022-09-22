import Foundation

struct UserDisplayNameResponse: Codable {
  var result: Result

  struct Result: Codable {
    var displayName: String?
    var email: String?
    var isStarterPlan: Bool?
    var isPro: Bool?
  }
}
