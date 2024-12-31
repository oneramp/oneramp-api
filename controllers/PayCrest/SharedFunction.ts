type CreateAPIMethod = <TInput extends Record<string, any>, TOutput>(opts: {
  url: string
  method: "GET" | "POST"
}) => (input: TInput) => Promise<TOutput>

export const get = async (
  url: string,
  input: Record<string, any>,
  headers?: Record<string, string>
) => {
  return fetch(`${url}?${new URLSearchParams(input).toString()}`, {
    method: "GET",
    headers: {
      ...(headers || {}),
    },
  })
}

export const post = async (
  url: string,
  input: Record<string, any>,
  headers?: Record<string, string>
) => {
  return fetch(url, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  })
}

interface CreateAPIMethodOptions {
  url: string
  method: "GET" | "POST"
  headers?: Record<string, string> // Optional headers property
}

type CreateAPIMethodType = (
  opts: CreateAPIMethodOptions
) => (input: Record<string, any>) => Promise<any>

export const createAPIMethod: CreateAPIMethodType = (opts) => (input) => {
  const method = opts.method === "GET" ? get : post
  return method(opts.url, input, opts.headers).then((res) => res.json())
}
