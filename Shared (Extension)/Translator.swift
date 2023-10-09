import Foundation

class Translator {
  func translate(payload: [String: Any], completionHandler: @escaping (Result<Any, Error>) -> Void) {
    var request = URLRequest(url: URL(string: "https://api.deepl.com/jsonrpc")!)
    if let method = payload["method"] as? String {
      request.httpMethod = method
    }
    if let headers = payload["headers"] as? [String: String] {
      for (name, value) in headers {
        request.setValue(value, forHTTPHeaderField: name)
      }
    }
    let credentials = Credentials()
    guard let credential = credentials.fetch() else {
      completionHandler(.failure(URLError(.userAuthenticationRequired)))
      return
    }
    if let token = credential["token"] {
      request.setValue(token, forHTTPHeaderField: "dl_session")
    }
    if let session = credential["session"] {
      request.setValue(session, forHTTPHeaderField: "Cookie")
    }
    if let body = payload["body"] as? String {
      request.httpBody = body.data(using: .utf8)
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

        let result = String(decoding: data, as: UTF8.self)
        completionHandler(.success(result))
      }
      .resume()
  }

  func translateSelection(payload: [String: Any], completionHandler: @escaping (Result<Any, Error>) -> Void) {
    var request = URLRequest(url: URL(string: "https://www2.deepl.com/jsonrpc")!)
    if let method = payload["method"] as? String {
      request.httpMethod = method
    }
    if let headers = payload["headers"] as? [String: String] {
      for (name, value) in headers {
        request.setValue(value, forHTTPHeaderField: name)
      }
    }
    if let body = payload["body"] as? String {
      request.httpBody = body.data(using: .utf8)
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

        let result = String(decoding: data, as: UTF8.self)
        completionHandler(.success(result))
      }
      .resume()
  }
}
