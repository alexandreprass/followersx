import { TwitterApi } from 'twitter-api-v2';

export function getTwitterClient(accessToken) {
  return new TwitterApi(accessToken);
}

export async function getUserInfo(client) {
  const { data } = await client.v2.me({
    'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'],
  });
  return data;
}

export async function getFollowers(client, userId) {
  return client.v2.followers(userId, {
    max_results: 1000,
    'user.fields': ['profile_image_url', 'name', 'username'],
  });
}

export async function getFollowing(client, userId) {
  return client.v2.following(userId, { max_results: 1000 });
}

export async function unfollowUser(client, sourceUserId, targetUserId) {
  await client.v2.unfollow(sourceUserId, targetUserId);
  await new Promise(r => setTimeout(r, 1200)); // delay seguro
}