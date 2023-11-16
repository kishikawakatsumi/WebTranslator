import Foundation

struct AccountRequest: Codable {
  var jsonrpc = "2.0"
  var method = "refresh"
  var params = Params()

  struct Params: Codable {
    var types = ["account"]
  }
}
