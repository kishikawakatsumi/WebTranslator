import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  private var solver: CFSolver?
  private var authenticator: Authenticator?
  private var translator: Translator?

  func beginRequest(with context: NSExtensionContext) {
    guard let inputItems = context.inputItems as? [NSExtensionItem] else {
      sendErrorResponse(context: context)
      return
    }

    guard let message = inputItems.first?.userInfo?[SFExtensionMessageKey] as? [String: Any] else {
      sendErrorResponse(context: context)
      return
    }

    guard let method = message["method"] as? String else {
      sendErrorResponse(context: context)
      return
    }

    switch method {
    case "cf_clearance":
      DispatchQueue.performOnMainQueue {
        let solver = CFSolver()
        solver.solve { (result) in
          switch result {
          case .success(let cookies):
            sendResponse(data: ["result": cookies], context: context)
          case .failure(_):
            sendErrorResponse(context: context)
          }
        }
        self.solver = solver
      }
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
      guard let session = credential["session"] else {
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

      let authenticator = Authenticator(session: session)
      authenticator.getUserDisplayName() { (result) in
        switch result {
        case .success(let result):
          sendResponse(
            data: [
              "result": [
                "displayName": result.displayName ?? "",
                "email": result.email ?? "",
                "isStarterPlan": result.isStarterPlan ?? false,
                "isPro": result.isPro ?? false,

                "credentials": [
                  "email": credential["email"] ?? "",
                  "password": credential["password"] ?? "",
                ]
              ]
            ],
            context: context
          )
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
        }
      }
      self.authenticator = authenticator
    case "translate":
      guard let payload = message["payload"] as? [String: Any] else {
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
    case "translateSelection":
      guard let payload = message["payload"] as? [String: Any] else {
        sendErrorResponse(context: context)
        return
      }

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
    default:
      sendErrorResponse(context: context)
    }
  }
}

func sendResponse(data: [String: Any], context: NSExtensionContext) {
  let item = NSExtensionItem()
  item.userInfo = [SFExtensionMessageKey: data]
  context.completeRequest(returningItems: [item])
}

func sendErrorResponse(context: NSExtensionContext) {
  context.completeRequest(returningItems: nil)
}

private extension DispatchQueue {
  static func performOnMainQueue(execute work: () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync(execute: work)
    }
  }
}
