import Foundation

struct AccountRequest: Codable {
  var jsonrpc = "2.0"
  var method = "getClientState"
  var params = Params()

  struct Params: Codable {
    var v = "20180814"
    var clientVars = [String: String]()
  }
}
