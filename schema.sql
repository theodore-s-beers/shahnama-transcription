CREATE TABLE user (
    id TEXT NOT NULL PRIMARY KEY,
    github_id INTEGER NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    short_name TEXT UNIQUE
);

CREATE TABLE session (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE line (
    id INTEGER NOT NULL PRIMARY KEY,
    volume_number INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    number_within_page INTEGER NOT NULL,
    editor TEXT NOT NULL,
    heading INTEGER NOT NULL,
    heading_text TEXT,
    number_listed INTEGER,
    hemistich_one_text TEXT,
    hemistich_one_notes INTEGER,
    hemistich_two_text TEXT,
    hemistich_two_notes INTEGER,
    FOREIGN KEY (editor) REFERENCES user(short_name),
    UNIQUE (volume_number, page_number, number_within_page, editor)
);

CREATE TABLE line_simplified (
    id INTEGER NOT NULL PRIMARY KEY,
    volume_number INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    number_within_page INTEGER NOT NULL,
    editor TEXT NOT NULL,
    is_heading INTEGER NOT NULL,
    has_notes INTEGER NOT NULL,
    number_listed INTEGER,
    heading_text TEXT,
    hemistich_one_text TEXT,
    hemistich_two_text TEXT,
    FOREIGN KEY (editor) REFERENCES user(short_name),
    UNIQUE (volume_number, page_number, number_within_page, editor)
);
