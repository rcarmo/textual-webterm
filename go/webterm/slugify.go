package webterm

import (
	"regexp"
	"strings"
)

var (
	slugNonWord = regexp.MustCompile(`[^\w\s-]`)
	slugSpaces  = regexp.MustCompile(`[-\s]+`)
)

func Slugify(value string) string {
	v := strings.ToLower(value)
	v = slugNonWord.ReplaceAllString(v, "")
	v = slugSpaces.ReplaceAllString(v, "-")
	return strings.Trim(v, "-_")
}
