import Foundation

struct LoginRequest: Codable {
  var jsonrpc = "2.0"
  var method = "login"
  var params: Params

  struct Params: Codable {
    var email: String
    var password: String
    var keepLogin = true
    var version = "44"
    var loginDomain = "default"
    var referrer = "https://www.deepl.com/translator#login"
    var clearanceInfo = ClearanceInfo()

    struct ClearanceInfo: Codable {
      var status = 200
      var duration = 60
    }
  }
}
