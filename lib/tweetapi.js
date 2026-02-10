export async function fetchFollowersFromTweetAPI(username, cursor = null) {
  const baseUrl = "https://api.tweetapi.com/2/user/followers";

  const params = new URLSearchParams({
    username,
    max_results: "1000",
  });

  if (cursor) params.append("pagination_token", cursor);

  const res = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      "x-api-key": process.env.TWEETAPI_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("TweetAPI error: " + err);
  }

  return res.json();
}
