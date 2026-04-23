import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  private var authenticator: Authenticator?
  private var translator: Translator?

  func beginRequest(with context: NSExtensionContext) {
    guard let inputItems = context.inputItems as? [NSExtensionItem] else {
      sendErrorResponse(context: context)
      return
    }

    guard let message = inputItems.first?.userInfo?[safariExtensionMessageKey] as? [String: Any] else {
      sendErrorResponse(context: context)
      return
    }

    guard let method = message["method"] as? String else {
      sendErrorResponse(context: context)
      return
    }

    switch method {
    case "login":
      guard let email = message["email"] as? String else {
        sendErrorResponse(context: context)
        return
      }
      guard let password = message["password"] as? String else {
        sendErrorResponse(context: context)
        return
      }
      guard let cookies = message["cookies"] as? String else {
        sendErrorResponse(context: context)
        return
      }

      let authenticator = Authenticator(session: cookies)
      authenticator.login(email: email, password: password) { (result) in
        switch result {
        case .success(let token):
          let result = [
            "email": email,
            "password": password,
            "token": token,
            "session": "\(cookies)dl_session=\(token);",
          ]

          let credentials = Credentials()
          credentials.update(result)

          sendResponse(data: ["result": result], context: context)
        case .failure(_):
          sendErrorResponse(context: context)
        }
      }
      self.authenticator = authenticator
    case "logout":
      Credentials().clear()
      sendResponse(
        data: ["result": "success"],
        context: context
      )
    case "refreshSession":
      guard
        let credential = Credentials().fetch(),
        let session = credential["session"], !session.isEmpty
      else {
        sendErrorResponse(context: context)
        return
      }
      let authenticator = Authenticator(
        session: session,
        userAgent: credential["userAgent"]
      )
      let before = accessTokenExp(from: session)
      authenticator.refreshSession { result in
        switch result {
        case .success(let newSession):
          var updated = credential
          updated["session"] = newSession
          Credentials().update(updated)
          let after = accessTokenExp(from: newSession)
          var payload: [String: Any] = [
            "success": true,
          ]
          if let before = before { payload["beforeExp"] = before }
          if let after = after { payload["afterExp"] = after }
          sendResponse(data: ["result": payload], context: context)
        case .failure(let error):
          sendResponse(
            data: [
              "result": [
                "success": false,
                "error": "\(error)",
              ]
            ],
            context: context
          )
        }
      }
      self.authenticator = authenticator
    case "getLoginSession":
      let credentials = Credentials()
      guard let credential = credentials.fetch() else {
        sendErrorResponse(context: context)
        return
      }
      guard let _ = credential["session"] else {
        sendErrorResponse(context: context)
        return
      }
      sendResponse(
        data: ["result": "[REDACTED]"],
        context: context
      )
    case "getUserDisplayName":
      let credentials = Credentials()
      guard let credential = credentials.fetch() else {
        sendErrorResponse(context: context)
        return
      }
      guard credential["session"] != nil else {
        sendResponse(
          data: [
            "result": [
              "credentials": [
                "email": credential["email"] ?? "",
                "password": credential["password"] ?? "",
              ]
            ]
          ],
          context: context
        )
        return
      }

      ensureFreshSession(credential: credential) { freshResult in
        let refreshed: [String: String]
        switch freshResult {
        case .success(let cred):
          refreshed = cred
        case .failure(_):
          sendResponse(
            data: [
              "result": [
                "credentials": [
                  "email": credential["email"] ?? "",
                  "password": credential["password"] ?? "",
                ]
              ]
            ],
            context: context
          )
          return
        }

        guard let freshSession = refreshed["session"] else {
          sendErrorResponse(context: context)
          return
        }

        let authenticator = Authenticator(
          session: freshSession,
          userAgent: refreshed["userAgent"]
        )
        let storedEmail = refreshed["email"] ?? ""
        authenticator.getAccount() { (accountResult) in
          switch accountResult {
          case .success(let accountData):
            let isTokenActive: Bool = {
              guard let expiresAt = accountData.loginState?.accessTokenExpiresAt else {
                return true
              }
              let nowMs = Int(Date().timeIntervalSince1970 * 1000)
              return nowMs < expiresAt
            }()
            let isLoggedIn = accountData.loginState != nil && isTokenActive
            let isPro = accountData.featureSet?.translator?.service == "pro"
            let expiresAt = accountData.loginState?.accessTokenExpiresAt

            var derivedEmail = storedEmail
            if derivedEmail.isEmpty,
               let emailFromJWT = emailFromSession(freshSession)
            {
              derivedEmail = emailFromJWT
              var updated = refreshed
              updated["email"] = emailFromJWT
              Credentials().update(updated)
            }

            var responseResult: [String: Any] = [
              "displayName": "",
              "email": derivedEmail,
              "isPro": isPro,
              "isLoggedIn": isLoggedIn,
              "credentials": [
                "email": derivedEmail,
                "password": refreshed["password"] ?? "",
              ],
            ]
            if let expiresAt = expiresAt {
              responseResult["expiresAt"] = expiresAt
            }
            sendResponse(
              data: ["result": responseResult],
              context: context
            )
          case .failure(_):
            sendResponse(
              data: [
                "result": [
                  "credentials": [
                    "email": storedEmail,
                    "password": refreshed["password"] ?? "",
                  ]
                ]
              ],
              context: context
            )
          }
        }
        self.authenticator = authenticator
      }
    case "translate":
      guard let payload = message["payload"] as? [String: Any] else {
        sendErrorResponse(context: context)
        return
      }
      guard let credential = Credentials().fetch() else {
        sendErrorResponse(context: context)
        return
      }
      ensureFreshSession(credential: credential) { result in
        if case .failure = result {
          sendErrorResponse(context: context)
          return
        }
        let translator = Translator()
        translator.translate(payload: payload) { (result) in
          switch result {
          case .success(let result):
            sendResponse(data: ["result": result], context: context)
          case .failure(_):
            sendErrorResponse(context: context)
          }
        }
        self.translator = translator
      }
    case "translateSelection":
      guard let payload = message["payload"] as? [String: Any] else {
        sendErrorResponse(context: context)
        return
      }

      let runTranslator: () -> Void = {
        let translator = Translator()
        translator.translateSelection(payload: payload) { (result) in
          switch result {
          case .success(let result):
            sendResponse(data: ["result": result], context: context)
          case .failure(_):
            sendErrorResponse(context: context)
          }
        }
        self.translator = translator
      }
      if let credential = Credentials().fetch() {
        ensureFreshSession(credential: credential) { _ in
          runTranslator()
        }
      } else {
        runTranslator()
      }
    default:
      sendErrorResponse(context: context)
    }
  }
}

/// `SFExtensionMessageKey` は macOS 11.0+ / iOS 15.0+ のみで利用可能な
/// availability 修飾付き定数のため、その値である "message" をリテラルで
/// 代替することで古い macOS ターゲットの availability エラーを回避する。
let safariExtensionMessageKey = "message"

func sendResponse(data: [String: Any], context: NSExtensionContext) {
  let item = NSExtensionItem()
  item.userInfo = [safariExtensionMessageKey: data]
  context.completeRequest(returningItems: [item])
}

func sendErrorResponse(context: NSExtensionContext) {
  context.completeRequest(returningItems: nil)
}

func emailFromSession(_ session: String) -> String? {
  for cookieName in ["dl_id", "dl_access"] {
    if let email = emailFromJWTCookie(session, cookieName: cookieName) {
      return email
    }
  }
  return nil
}

private func emailFromJWTCookie(_ session: String, cookieName: String) -> String? {
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

/// `dl_access` JWT の `exp` (UNIX 秒) を取り出す。取れない場合は nil。
func accessTokenExp(from session: String) -> Int? {
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

func ensureFreshSession(
  credential: [String: String],
  completion: @escaping (Result<[String: String], Error>) -> Void
) {
  guard let session = credential["session"], !session.isEmpty else {
    completion(.failure(URLError(.userAuthenticationRequired)))
    return
  }
  let now = Int(Date().timeIntervalSince1970)
  if let exp = accessTokenExp(from: session), exp > now + 30 {
    completion(.success(credential))
    return
  }
  let authenticator = Authenticator(
    session: session,
    userAgent: credential["userAgent"]
  )
  authenticator.refreshSession { result in
    switch result {
    case .success(let newSession):
      var updated = credential
      updated["session"] = newSession
      Credentials().update(updated)
      completion(.success(updated))
    case .failure(let error):
      completion(.failure(error))
    }
  }
}

private func base64URLDecode(_ input: String) -> Data? {
  var base64 = input
    .replacingOccurrences(of: "-", with: "+")
    .replacingOccurrences(of: "_", with: "/")
  let remainder = base64.count % 4
  if remainder > 0 {
    base64.append(String(repeating: "=", count: 4 - remainder))
  }
  return Data(base64Encoded: base64)
}
