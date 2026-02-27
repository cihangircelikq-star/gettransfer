
export function deduplicateRequests(list: any[]) {
  const uniqueMap = new Map<string, any>()
  list.forEach((req) => {
    // Key by customerId to ensure one request per customer
    if (req.customerId) {
        uniqueMap.set(req.customerId, req)
    }
  })
  return Array.from(uniqueMap.values())
}

export function mergeRequest(currentList: any[], newRequest: any) {
  // Remove any existing request from this customer or with this ID
  const others = currentList.filter((x) => x.customerId !== newRequest.customerId && x.id !== newRequest.id)
  return [...others, newRequest]
}
