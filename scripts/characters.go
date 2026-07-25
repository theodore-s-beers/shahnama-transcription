package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const (
	transcribedLinesEndpoint = "https://transcribe.akvan.dev/api/transcribed-lines"
	characterColumnWidth     = 8
)

type line struct {
	HeadingText  string `json:"headingText"`
	HemistichOne string `json:"hemistichOne"`
	HemistichTwo string `json:"hemistichTwo"`
}

type unicodeCharacter struct {
	CodePoint string `json:"cpoint"`
	Name      string `json:"name"`
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	lines, err := fetchLines()
	if err != nil {
		return err
	}

	characters := make(map[rune]struct{})
	for _, line := range lines {
		addCharacters(characters, line.HeadingText)
		addCharacters(characters, line.HemistichOne)
		addCharacters(characters, line.HemistichTwo)
	}

	sortedCharacters := make([]rune, 0, len(characters))
	for character := range characters {
		sortedCharacters = append(sortedCharacters, character)
	}
	slices.Sort(sortedCharacters)

	unicodeNames, err := getUnicodeNames(sortedCharacters)
	if err != nil {
		return err
	}

	for _, character := range sortedCharacters {
		name, found := unicodeNames[character]
		if !found {
			name = "UNKNOWN"
		}

		quotedCharacter := quoteCharacter(character)
		fmt.Printf("U+%04X  %-*s  %s\n", character, characterColumnWidth, quotedCharacter, name)
	}

	fmt.Fprintf(os.Stderr, "\n%d lines; %d distinct characters\n", len(lines), len(characters))
	return nil
}

func fetchLines() ([]line, error) {
	endpoint, err := url.Parse(transcribedLinesEndpoint)
	if err != nil {
		return nil, fmt.Errorf("parse endpoint URL: %w", err)
	}

	query := endpoint.Query()
	query.Set("start-vol", "2")
	query.Set("start-pg", "117")
	query.Set("start-line", "1")
	query.Set("end-vol", "2")
	query.Set("end-pg", "199")
	query.Set("end-line", "5")
	query.Set("editor", "tsb")
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequest(http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	request.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch transcribed lines: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(io.LimitReader(response.Body, 4<<10))
		if readErr != nil {
			return nil, fmt.Errorf("API returned %s", response.Status)
		}
		return nil, fmt.Errorf("API returned %s: %s", response.Status, body)
	}

	var lines []line
	if err := json.NewDecoder(response.Body).Decode(&lines); err != nil {
		return nil, fmt.Errorf("decode transcribed lines: %w", err)
	}
	if len(lines) == 0 {
		return nil, fmt.Errorf("API returned no transcribed lines")
	}

	return lines, nil
}

func getUnicodeNames(characters []rune) (map[rune]string, error) {
	command := exec.Command(
		"uni",
		"identify",
		"-as", "json",
		"-compact",
		"-format", "%(cpoint) %(name)",
		"--",
		string(characters),
	)

	output, err := command.CombinedOutput()
	if err != nil {
		detail := strings.TrimSpace(string(output))
		if detail == "" {
			return nil, fmt.Errorf("run uni identify: %w", err)
		}
		return nil, fmt.Errorf("run uni identify: %w: %s", err, detail)
	}

	var identifiedCharacters []unicodeCharacter
	if err := json.Unmarshal(output, &identifiedCharacters); err != nil {
		return nil, fmt.Errorf("decode uni output: %w", err)
	}

	names := make(map[rune]string, len(identifiedCharacters))
	for _, character := range identifiedCharacters {
		codePoint := strings.TrimPrefix(character.CodePoint, "U+")
		value, err := strconv.ParseInt(codePoint, 16, 32)
		if err != nil {
			return nil, fmt.Errorf("parse uni code point %q: %w", character.CodePoint, err)
		}
		names[rune(value)] = character.Name
	}

	return names, nil
}

func quoteCharacter(character rune) string {
	if unicode.Is(unicode.Mark, character) {
		return strconv.QuoteRuneToASCII(character)
	}
	return strconv.QuoteRune(character)
}

func addCharacters(set map[rune]struct{}, text string) {
	for _, character := range text {
		set[character] = struct{}{}
	}
}
