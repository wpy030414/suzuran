package crudgen

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"unicode"
)

// Generator handles CRUD code generation from templates
type Generator struct {
	templateDir string
	outputDir   string
}

// NewGenerator creates a new code generator
func NewGenerator(templateDir, outputDir string) *Generator {
	return &Generator{
		templateDir: templateDir,
		outputDir:   outputDir,
	}
}

// TemplateData holds data for template rendering
type TemplateData struct {
	ModelName      string
	ModelNameLower string
	TableName      string
	Package        string
	Fields         []Field
}

// Field represents a model field
type Field struct {
	Name     string
	Type     string
	JSONTag  string
	GormTag  string
	Required bool
}

// validate checks that the template data contains the required fields.
func (d TemplateData) validate() error {
	if strings.TrimSpace(d.ModelName) == "" {
		return fmt.Errorf("ModelName is required")
	}
	if strings.TrimSpace(d.Package) == "" {
		return fmt.Errorf("Package is required")
	}
	return nil
}

// Generate generates CRUD files from templates
func (g *Generator) Generate(data TemplateData) error {
	if err := data.validate(); err != nil {
		return fmt.Errorf("invalid template data: %w", err)
	}

	// Auto-derive naming when not explicitly provided.
	if data.ModelNameLower == "" {
		data.ModelNameLower = toSnakeCase(data.ModelName)
	}
	if data.TableName == "" && data.ModelNameLower != "" {
		data.TableName = data.ModelNameLower + "s"
	}

	templates := []string{
		"model.go.tmpl",
		"repository.go.tmpl",
		"service.go.tmpl",
		"handler.go.tmpl",
	}

	for _, tmplFile := range templates {
		if err := g.generateFile(tmplFile, data); err != nil {
			return fmt.Errorf("failed to generate %s: %w", tmplFile, err)
		}
	}

	return nil
}

func (g *Generator) generateFile(tmplFile string, data TemplateData) error {
	tmplPath := filepath.Join(g.templateDir, tmplFile)
	tmplContent, err := os.ReadFile(tmplPath)
	if err != nil {
		return fmt.Errorf("failed to read template %s: %w", tmplFile, err)
	}

	tmpl, err := template.New(tmplFile).Parse(string(tmplContent))
	if err != nil {
		return fmt.Errorf("failed to parse template %s: %w", tmplFile, err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute template %s: %w", tmplFile, err)
	}

	// Determine output file name
	outputFile := g.getOutputFileName(tmplFile, data)
	outputPath := filepath.Join(g.outputDir, outputFile)

	if err := os.WriteFile(outputPath, buf.Bytes(), 0644); err != nil {
		return fmt.Errorf("failed to write output file %s: %w", outputPath, err)
	}

	return nil
}

func (g *Generator) getOutputFileName(tmplFile string, data TemplateData) string {
	base := tmplFile[:len(tmplFile)-len(".tmpl")] // Remove .tmpl extension

	switch base {
	case "model.go":
		return fmt.Sprintf("%s.go", data.ModelNameLower)
	case "repository.go":
		return fmt.Sprintf("%s_repository.go", data.ModelNameLower)
	case "service.go":
		return fmt.Sprintf("%s_service.go", data.ModelNameLower)
	case "handler.go":
		return fmt.Sprintf("%s_handler.go", data.ModelNameLower)
	default:
		return base
	}
}

// toSnakeCase converts a camelCase or PascalCase string to snake_case.
func toSnakeCase(s string) string {
	if s == "" {
		return ""
	}

	var result strings.Builder
	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				result.WriteByte('_')
			}
			result.WriteRune(unicode.ToLower(r))
		} else {
			result.WriteRune(r)
		}
	}

	return result.String()
}

// toCamelCase converts a snake_case string to camelCase (lower first letter).
func toCamelCase(s string) string {
	if s == "" {
		return ""
	}

	parts := strings.Split(s, "_")
	for i := range parts {
		if parts[i] == "" {
			continue
		}
		if i == 0 {
			parts[i] = strings.ToLower(parts[i][:1]) + parts[i][1:]
		} else {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}

	return strings.Join(parts, "")
}
