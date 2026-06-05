-- Reels module: allow scheduled_post.post_type = 'reels'.
alter type post_type add value if not exists 'reels';
