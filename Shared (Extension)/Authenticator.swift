import Foundation

class Authenticator {
  private let session: String

  init(session: String) {
    self.session = session
  }

  func login(email: String, password: String, completionHandler: @escaping (Result<String, Error>) -> Void) {
    var request = URLRequest(url: URL(string: "https://w.deepl.com/account?request_type=jsonrpc&method=login")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-type")
    request.setValue(session, forHTTPHeaderField: "Cookie")

    let encoder = JSONEncoder()
    request.httpBody = try! encoder.encode(
      LoginRequest(
        params: LoginRequest.Params(
          email: email, password: password
        )
      )
    )

    URLSession(configuration: .ephemeral)
      .dataTask(with: request) { (data, response, error) in
        if let error = error {
          completionHandler(.failure(error))
          return
        }
        guard let data = data else {
          completionHandler(.failure(URLError(.zeroByteResource)))
          return
        }

        do {
          let decoder = JSONDecoder()
          let response = try decoder.decode(LoginResponse.self, from: data)

          completionHandler(.success(response.result.token))
        } catch {
          completionHandler(.failure(error))
        }
      }
      .resume()
  }

  func getAccount(completionHandler: @escaping (Result<AccountResponse.Result, Error>) -> Void) {
    var request = URLRequest(url: URL(string: "https://backend-l.deepl.com/PHP/backend/account.php?request_type=jsonrpc&method=refresh")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-type")
    request.setValue(session, forHTTPHeaderField: "Cookie")

    let encoder = JSONEncoder()
    request.httpBody = try! encoder.encode(
      AccountRequest()
    )

    URLSession(configuration: .ephemeral)
      .dataTask(with: request) { (data, response, error) in
        if let error = error {
          completionHandler(.failure(error))
          return
        }
        guard let data = data else {
          completionHandler(.failure(URLError(.zeroByteResource)))
          return
        }

        do {
          let decoder = JSONDecoder()
          let response = try decoder.decode(AccountResponse.self, from: data)

          completionHandler(.success(response.result))
        } catch {
          completionHandler(.failure(error))
        }
      }
      .resume()
  }
}
