import Foundation

class Authenticator {
  private let session: String
  private let userAgent: String?

  init(session: String, userAgent: String? = nil) {
    self.session = session
    self.userAgent = userAgent
  }

  func login(email: String, password: String, completionHandler: @escaping (Result<String, Error>) -> Void) {
    var request = URLRequest(url: URL(string: "https://w.deepl.com/account?request_type=jsonrpc&method=login")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-type")
    request.setValue(session, forHTTPHeaderField: "Cookie")
    if let userAgent = userAgent {
      request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    }

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
    var request = URLRequest(url: URL(string: "https://w.deepl.com/web?request_type=jsonrpc&il=ja&method=getClientState")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-type")
    request.setValue(session, forHTTPHeaderField: "Cookie")
    if let userAgent = userAgent {
      request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    }

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

  func refreshSession(completionHandler: @escaping (Result<String, Error>) -> Void) {
    var request = URLRequest(
      url: URL(string: "https://w.deepl.com/signin/oidc_refresh")!
    )
    request.httpMethod = "POST"
    request.setValue(session, forHTTPHeaderField: "Cookie")
    request.setValue("*/*", forHTTPHeaderField: "Accept")
    request.setValue("https://www.deepl.com", forHTTPHeaderField: "Origin")
    request.setValue("https://www.deepl.com/", forHTTPHeaderField: "Referer")
    if let userAgent = userAgent {
      request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    }

    let config = URLSessionConfiguration.ephemeral
    config.httpCookieStorage = nil
    config.httpShouldSetCookies = false

    let currentSession = self.session

    URLSession(configuration: config)
      .dataTask(with: request) { _, response, error in
        if let error = error {
          completionHandler(.failure(error))
          return
        }
        guard
          let httpResponse = response as? HTTPURLResponse,
          (200..<300).contains(httpResponse.statusCode)
        else {
          completionHandler(.failure(URLError(.userAuthenticationRequired)))
          return
        }

        var cookieMap: [String: String] = [:]
        for pair in currentSession.split(separator: ";") {
          let trimmed = pair.trimmingCharacters(in: .whitespaces)
          guard let eq = trimmed.firstIndex(of: "=") else { continue }
          cookieMap[String(trimmed[..<eq])]
          = String(trimmed[trimmed.index(after: eq)...])
        }

        if
          let url = httpResponse.url,
          let headers = httpResponse.allHeaderFields as? [String: String]
        {
          let cookies = HTTPCookie.cookies(
            withResponseHeaderFields: headers,
            for: url
          )
          for cookie in cookies {
            cookieMap[cookie.name] = cookie.value
          }
        }

        let newSession = cookieMap
          .map { "\($0.key)=\($0.value)" }
          .joined(separator: ";") + ";"
        completionHandler(.success(newSession))
      }
      .resume()
  }

  func getUserInfo(completionHandler: @escaping (Result<[String: Any], Error>) -> Void) {
    guard let accessToken = extractDlAccessToken() else {
      completionHandler(.failure(URLError(.userAuthenticationRequired)))
      return
    }
    var request = URLRequest(
      url: URL(string: "https://auth.deepl.com/userinfo")!
    )
    request.httpMethod = "GET"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let userAgent = userAgent {
      request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    }

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
        guard
          let json = try? JSONSerialization.jsonObject(with: data),
          let dict = json as? [String: Any]
        else {
          completionHandler(.failure(URLError(.cannotParseResponse)))
          return
        }
        completionHandler(.success(dict))
      }
      .resume()
  }

  private func extractDlAccessToken() -> String? {
    guard let range = session.range(of: "dl_access=") else { return nil }
    let afterPrefix = session[range.upperBound...]
    let end = afterPrefix.firstIndex(of: ";") ?? afterPrefix.endIndex
    return String(afterPrefix[..<end])
  }
}
