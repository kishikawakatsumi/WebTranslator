import Foundation

struct SessionInfo {
  let email: String
  let accessTokenExpiresAt: Date
}

func loadSessionInfo() -> SessionInfo? {
  guard
    let credential = Credentials().fetch(),
    let session = credential["session"],
    !session.isEmpty
  else {
    return nil
  }
  let storedEmail = credential["email"] ?? ""
  let email =
    storedEmail.isEmpty ? (emailFromSession(session) ?? "") : storedEmail
  guard !email.isEmpty else { return nil }
  guard let exp = accessTokenExp(from: session) else { return nil }
  return SessionInfo(
    email: email,
    accessTokenExpiresAt: Date(timeIntervalSince1970: TimeInterval(exp))
  )
}

private func emailFromSession(_ session: String) -> String? {
  for cookieName in ["dl_id", "dl_access"] {
    if let email = emailFromJWTCookie(session, cookieName: cookieName) {
      return email
    }
  }
  return nil
}

private func emailFromJWTCookie(
  _ session: String,
  cookieName: String
) -> String? {
  let prefix = "\(cookieName)="
  guard let range = session.range(of: prefix) else { return nil }
  let afterPrefix = session[range.upperBound...]
  let end = afterPrefix.firstIndex(of: ";") ?? afterPrefix.endIndex
  let jwt = String(afterPrefix[..<end])
  let parts = jwt.split(separator: ".")
  guard
    parts.count >= 2,
    let payloadData = base64URLDecode(String(parts[1])),
    let json = try? JSONSerialization.jsonObject(with: payloadData),
    let dict = json as? [String: Any]
  else {
    return nil
  }
  for key in ["email", "preferred_username", "upn", "user_email", "mail"] {
    if let value = dict[key] as? String, value.contains("@") {
      return value
    }
  }
  return nil
}

private func accessTokenExp(from session: String) -> Int? {
  guard let range = session.range(of: "dl_access=") else { return nil }
  let afterPrefix = session[range.upperBound...]
  let end = afterPrefix.firstIndex(of: ";") ?? afterPrefix.endIndex
  let jwt = String(afterPrefix[..<end])
  let parts = jwt.split(separator: ".")
  guard
    parts.count >= 2,
    let payloadData = base64URLDecode(String(parts[1])),
    let json = try? JSONSerialization.jsonObject(with: payloadData),
    let dict = json as? [String: Any]
  else {
    return nil
  }
  return (dict["exp"] as? NSNumber)?.intValue
}

func refreshSession(completion: @escaping (Result<Void, Error>) -> Void) {
  guard
    let credential = Credentials().fetch(),
    let session = credential["session"],
    !session.isEmpty
  else {
    completion(.failure(URLError(.userAuthenticationRequired)))
    return
  }

  var request = URLRequest(
    url: URL(string: "https://w.deepl.com/signin/oidc_refresh")!
  )
  request.httpMethod = "POST"
  request.setValue(session, forHTTPHeaderField: "Cookie")
  request.setValue("*/*", forHTTPHeaderField: "Accept")
  request.setValue("https://www.deepl.com", forHTTPHeaderField: "Origin")
  request.setValue("https://www.deepl.com/", forHTTPHeaderField: "Referer")
  if let userAgent = credential["userAgent"], !userAgent.isEmpty {
    request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
  }

  let config = URLSessionConfiguration.ephemeral
  config.httpCookieStorage = nil
  config.httpShouldSetCookies = false

  URLSession(configuration: config)
    .dataTask(with: request) { _, response, error in
      if let error = error {
        DispatchQueue.main.async { completion(.failure(error)) }
        return
      }
      guard
        let httpResponse = response as? HTTPURLResponse,
        (200..<300).contains(httpResponse.statusCode)
      else {
        DispatchQueue.main.async {
          completion(.failure(URLError(.userAuthenticationRequired)))
        }
        return
      }

      var cookieMap: [String: String] = [:]
      for pair in session.split(separator: ";") {
        let trimmed = pair.trimmingCharacters(in: .whitespaces)
        guard let eq = trimmed.firstIndex(of: "=") else { continue }
        cookieMap[String(trimmed[..<eq])] =
          String(trimmed[trimmed.index(after: eq)...])
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

      let newSession =
        cookieMap.map { "\($0.key)=\($0.value)" }.joined(separator: ";") + ";"

      var updated = credential
      updated["session"] = newSession
      Credentials().update(updated)

      DispatchQueue.main.async { completion(.success(())) }
    }
    .resume()
}

private func base64URLDecode(_ input: String) -> Data? {
  var base64 =
    input
    .replacingOccurrences(of: "-", with: "+")
    .replacingOccurrences(of: "_", with: "/")
  let remainder = base64.count % 4
  if remainder > 0 {
    base64.append(String(repeating: "=", count: 4 - remainder))
  }
  return Data(base64Encoded: base64)
}
