import Foundation

struct UserDisplayNameRequest: Codable {
  var jsonrpc = "2.0"
  var method = "getUserDisplayName"
  var params = Params()

  struct Params: Codable {}
}
