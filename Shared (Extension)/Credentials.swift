import Foundation

private let service = "https://w.deepl.com"
private let account = "com.kishikawakatsumi.WebTranslator.Credentials"
private let teamID = Bundle.main.infoDictionary!["AppIdentifierPrefix"] ?? ""
private let accessGroup = "\(teamID)com.kishikawakatsumi.WebTranslator"

class Credentials {
  func fetch() -> [String : String]? {
    var query = [String: Any]()
    query[String(kSecClass)] = kSecClassGenericPassword
    query[String(kSecAttrService)] = service
    query[String(kSecAttrAccount)] = account
    query[String(kSecAttrAccessGroup)] = accessGroup
    query[String(kSecAttrSynchronizable)] = kSecAttrSynchronizableAny
    query[String(kSecMatchLimit)] = kSecMatchLimitOne
    query[String(kSecReturnData)] = kCFBooleanTrue

    var data: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &data)
    guard status == errSecSuccess else { return nil }

    guard let data = data as? Data, let result = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
      return nil
    }

    return result
  }

  func update(_ item: [String : String]) {
    var baseQuery = [String: Any]()
    baseQuery[String(kSecClass)] = kSecClassGenericPassword
    baseQuery[String(kSecAttrService)] = service
    baseQuery[String(kSecAttrAccount)] = account
    baseQuery[String(kSecAttrAccessGroup)] = accessGroup

    var query = baseQuery
    query[String(kSecAttrSynchronizable)] = kSecAttrSynchronizableAny
    query[String(kSecMatchLimit)] = kSecMatchLimitOne
    query[String(kSecReturnData)] = kCFBooleanTrue

    guard let data = try? JSONSerialization.data(withJSONObject: item, options: []) else { return }

    var attributes = [String: Any]()
    attributes[String(kSecValueData)] = data

    var status = SecItemCopyMatching(query as CFDictionary, nil)
    switch status {
    case errSecSuccess:
      var query = baseQuery
      query[String(kSecAttrSynchronizable)] = kCFBooleanFalse
      status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    case errSecItemNotFound:
      var attributes = baseQuery.merging(attributes) { (_, new) in new }
      attributes[String(kSecAttrSynchronizable)] = kCFBooleanFalse
      attributes[String(kSecAttrAccessible)] = kSecAttrAccessibleAfterFirstUnlock
      status = SecItemAdd(attributes as CFDictionary, nil)
    default:
      break
    }
  }

  func clear() {
    var query = [String: Any]()
    query[String(kSecClass)] = kSecClassGenericPassword
    query[String(kSecAttrService)] = service
    query[String(kSecAttrAccount)] = account
    query[String(kSecAttrAccessGroup)] = accessGroup
#if os(macOS)
    query[String(kSecMatchLimit)] = kSecMatchLimitAll
#endif

    SecItemDelete(query as CFDictionary)
  }
}
