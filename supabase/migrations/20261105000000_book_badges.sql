-- Badges count whole books now (one volume = one PDF), with lower targets: 1, 3, 10, 25.
-- Rename the keys kids may already hold; the old 5/25/100 rows map to the nearest new tier
-- that they certainly qualify for.
update public.child_badges set badge_key = 'first_book' where badge_key = 'first_chapter';
update public.child_badges set badge_key = 'books_3'    where badge_key = 'chapters_5';
update public.child_badges set badge_key = 'books_10'   where badge_key = 'chapters_25';
update public.child_badges set badge_key = 'books_25'   where badge_key = 'chapters_100';
