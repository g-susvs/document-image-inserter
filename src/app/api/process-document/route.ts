import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

export async function POST(request: NextRequest) {
  try {
    console.log("Starting document processing...")

    const formData = await request.formData()
    const wordFile = formData.get("wordFile") as File
    const sectionMarker = (formData.get("sectionMarker") as string) || "{{IMAGENES}}"

    console.log("Form data received:", {
      hasWordFile: !!wordFile,
      sectionMarker,
      formDataKeys: Array.from(formData.keys()),
    })

    if (!wordFile) {
      return NextResponse.json({ error: "No se encontró el archivo Word" }, { status: 400 })
    }

    // Obtener imágenes del antes y después con validación
    const beforeImages: File[] = []
    const afterImages: File[] = []

    try {
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("before_") && value instanceof File) {
          beforeImages.push(value)
        } else if (key.startsWith("after_") && value instanceof File) {
          afterImages.push(value)
        }
      }

      console.log("Images processed:", {
        beforeCount: beforeImages.length,
        afterCount: afterImages.length,
      })

      if (beforeImages.length === 0 && afterImages.length === 0) {
        return NextResponse.json({ error: "No se encontraron imágenes para procesar" }, { status: 400 })
      }

      // Procesar el documento DOCX
      console.log("Starting DOCX processing...")
      const processedBuffer = await processDocxWithComparisons(wordFile, beforeImages, afterImages, sectionMarker)
      console.log("DOCX processing completed successfully")

      return new NextResponse(processedBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="documento_antes_despues.docx"`,
        },
      })
    } catch (imageError) {
      console.error("Error processing images:", imageError)
      return NextResponse.json(
        { error: "Error al procesar las imágenes: " + (imageError as Error).message },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in API route:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

async function processDocxWithComparisons(
  wordFile: File,
  beforeImages: File[],
  afterImages: File[],
  sectionMarker: string,
): Promise<ArrayBuffer> {
  try {
    console.log("Reading DOCX file...")
    // Leer el archivo DOCX como ZIP
    const zip = new JSZip()
    const docxBuffer = await wordFile.arrayBuffer()
    const docxZip = await zip.loadAsync(docxBuffer)

    // Leer el documento principal
    const documentXml = await docxZip.file("word/document.xml")?.async("text")
    if (!documentXml) {
      throw new Error("No se pudo leer el contenido del documento")
    }

    console.log("Document XML loaded, length:", documentXml.length)

    // Verificar si el marcador existe
    if (!documentXml.includes(sectionMarker)) {
      throw new Error(`El marcador "${sectionMarker}" no se encontró en el documento`)
    }

    console.log("Marker found in document")

    // Combinar las imágenes en pares
    const imagePairs: Array<{ before?: File; after?: File }> = []
    const maxLength = Math.max(beforeImages.length, afterImages.length)

    for (let i = 0; i < maxLength; i++) {
      imagePairs.push({
        before: beforeImages[i],
        after: afterImages[i],
      })
    }

    console.log("Image pairs created:", imagePairs.length)

    // Procesar imágenes y agregarlas al ZIP
    const imageRelationships: string[] = []
    const mediaFolder = "word/media/"

    // Obtener el siguiente ID de relación disponible
    const nextRelId = await getNextRelationshipId(docxZip)
    console.log("Next relationship ID:", nextRelId)

    let relIdCounter = nextRelId
    for (let i = 0; i < imagePairs.length; i++) {
      const pair = imagePairs[i]

      // Procesar imagen del antes si existe
      if (pair.before) {
        try {
          const imageBuffer = await pair.before.arrayBuffer()
          const extension = pair.before.name.split(".").pop()?.toLowerCase() || "png"
          const imageName = `before_${Date.now()}_${i + 1}.${extension}`

          docxZip.file(mediaFolder + imageName, imageBuffer)
          const relationshipId = `rId${relIdCounter++}`
          imageRelationships.push(relationshipId)
          await updateRelationships(docxZip, relationshipId, imageName)
          console.log(`Processed before image ${i + 1}:`, imageName)
        } catch (imgError) {
          console.error(`Error processing before image ${i + 1}:`, imgError)
          imageRelationships.push("")
        }
      } else {
        imageRelationships.push("")
      }

      // Procesar imagen del después si existe
      if (pair.after) {
        try {
          const imageBuffer = await pair.after.arrayBuffer()
          const extension = pair.after.name.split(".").pop()?.toLowerCase() || "png"
          const imageName = `after_${Date.now()}_${i + 1}.${extension}`

          docxZip.file(mediaFolder + imageName, imageBuffer)
          const relationshipId = `rId${relIdCounter++}`
          imageRelationships.push(relationshipId)
          await updateRelationships(docxZip, relationshipId, imageName)
          console.log(`Processed after image ${i + 1}:`, imageName)
        } catch (imgError) {
          console.error(`Error processing after image ${i + 1}:`, imgError)
          imageRelationships.push("")
        }
      } else {
        imageRelationships.push("")
      }
    }

    console.log("All images processed, updating document XML...")

    // Reemplazar el marcador con las comparaciones en el XML
    const updatedDocumentXml = replaceMarkerWithComparisons(documentXml, sectionMarker, imagePairs, imageRelationships)

    console.log("Document XML updated")

    // Actualizar el documento en el ZIP
    docxZip.file("word/document.xml", updatedDocumentXml)

    console.log("Generating final DOCX...")

    // Generar el nuevo archivo DOCX
    return await docxZip.generateAsync({ type: "arraybuffer" })
  } catch (error) {
    console.error("Error in processDocxWithComparisons:", error)
    throw new Error("Error al procesar el documento: " + (error as Error).message)
  }
}

async function getNextRelationshipId(docxZip: JSZip): Promise<number> {
  try {
    const relsPath = "word/_rels/document.xml.rels"
    const relsXml = await docxZip.file(relsPath)?.async("text")

    if (!relsXml) {
      return 1
    }

    // Encontrar todos los IDs de relación existentes
    const idMatches = relsXml.match(/Id="rId(\d+)"/g) || []
    const ids = idMatches.map((match) => Number.parseInt(match.match(/\d+/)?.[0] || "0"))

    return ids.length > 0 ? Math.max(...ids) + 1 : 1
  } catch (error) {
    console.error("Error getting next relationship ID:", error)
    return 1
  }
}

async function updateRelationships(docxZip: JSZip, relationshipId: string, imageName: string) {
  try {
    const relsPath = "word/_rels/document.xml.rels"
    let relsXml = await docxZip.file(relsPath)?.async("text")

    if (!relsXml) {
      // Crear archivo de relaciones si no existe
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
    }

    // Agregar nueva relación para la imagen
    const newRelationship = `  <Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`

    // Insertar antes del cierre de Relationships
    const updatedRelsXml = relsXml.replace("</Relationships>", `${newRelationship}\n</Relationships>`)

    docxZip.file(relsPath, updatedRelsXml)
  } catch (error) {
    console.error("Error updating relationships:", error)
    throw new Error("Error al actualizar las relaciones de imágenes")
  }
}

function replaceMarkerWithComparisons(
  documentXml: string,
  sectionMarker: string,
  imagePairs: Array<{ before?: File; after?: File }>,
  imageRelationships: string[],
): string {
  try {
    // Crear XML para las comparaciones antes/después
    let comparisonsXml = ""

    // Agregar título de sección
    comparisonsXml += `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr>
          <w:spacing w:before="240" w:after="180"/>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="24"/>
          </w:rPr>
        </w:r>
      </w:p>`

    // Crear tabla para organizar comparaciones
    comparisonsXml += `
    <w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2500"/>
        <w:gridCol w:w="2500"/>
      </w:tblGrid>`

    // Procesar cada par de imágenes
    for (let i = 0; i < imagePairs.length; i++) {
      const pair = imagePairs[i]
      const beforeRelId = imageRelationships[i * 2]
      const afterRelId = imageRelationships[i * 2 + 1]

      comparisonsXml += `
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="2500" w:type="pct"/>
              <w:tcMar>
                <w:left w:w="0" w:type="dxa"/>
                <w:right w:w="120" w:type="dxa"/>
              </w:tcMar>
            </w:tcPr>`

      // Imagen del antes
      if (pair.before && beforeRelId) {
        comparisonsXml += createComparisonImageCell(pair.before, beforeRelId, i + 1, "antes")
      } else {
        comparisonsXml += `
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="120" w:after="120"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:color w:val="999999"/>
                </w:rPr>
                <w:t>Sin imagen</w:t>
              </w:r>
            </w:p>`
      }

      comparisonsXml += `
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="2500" w:type="pct"/>
              <w:tcMar>
                <w:left w:w="120" w:type="dxa"/>
                <w:right w:w="0" w:type="dxa"/>
              </w:tcMar>
            </w:tcPr>`

      // Imagen del después
      if (pair.after && afterRelId) {
        comparisonsXml += createComparisonImageCell(pair.after, afterRelId, i + 1, "después")
      } else {
        comparisonsXml += `
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:before="120" w:after="120"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:color w:val="999999"/>
                </w:rPr>
                <w:t>Sin imagen</w:t>
              </w:r>
            </w:p>`
      }

      comparisonsXml += `
          </w:tc>
        </w:tr>`
    }

    comparisonsXml += `
      </w:tbl>`

    // Agregar espacio después de la tabla
    comparisonsXml += `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr>
          <w:spacing w:after="240"/>
        </w:pPr>
      </w:p>`

    // IMPORTANTE: Solo reemplazar el texto del marcador, NO el párrafo completo
    const markerInTextRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(${escapeRegExp(sectionMarker)})([^<]*)(</w:t>)`, "g")

    let updatedXml = documentXml.replace(
      markerInTextRegex,
      (match, openTag, beforeText, marker, afterText, closeTag) => {
        let replacement = ""

        if (beforeText.trim()) {
          replacement += `${openTag}${beforeText}${closeTag}`
        }

        replacement += `</w:r></w:p>${comparisonsXml}<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r>`

        if (afterText.trim()) {
          replacement += `${openTag}${afterText}${closeTag}`
        }

        return replacement
      },
    )

    if (updatedXml === documentXml) {
      updatedXml = documentXml.replace(sectionMarker, comparisonsXml)
    }

    return updatedXml
  } catch (error) {
    console.error("Error replacing marker with comparisons:", error)
    throw new Error("Error al generar las comparaciones en el documento")
  }
}

function createComparisonImageCell(
  image: File,
  relationshipId: string,
  comparisonNumber: number,
  type: string,
): string {
  return `
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="120"/>
              </w:pPr>
              <w:r>
                <w:drawing>
                  <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="2400000" cy="3200000"/>
                    <wp:effectExtent l="0" t="0" r="0" b="0"/>
                    <wp:docPr id="${comparisonNumber}" name="Comparación ${comparisonNumber} - ${type}"/>
                    <wp:cNvGraphicFramePr>
                      <a:graphicFrameLocks noChangeAspect="1"/>
                    </wp:cNvGraphicFramePr>
                    <a:graphic>
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:pic>
                          <pic:nvPicPr>
                            <pic:cNvPr id="0" name="${escapeXml(image.name)}"/>
                            <pic:cNvPicPr/>
                          </pic:nvPicPr>
                          <pic:blipFill>
                            <a:blip r:embed="${relationshipId}"/>
                            <a:stretch>
                              <a:fillRect/>
                            </a:stretch>
                          </pic:blipFill>
                          <pic:spPr>
                            <a:xfrm>
                              <a:off x="0" y="0"/>
                              <a:ext cx="2400000" cy="3200000"/>
                            </a:xfrm>
                            <a:prstGeom prst="rect">
                              <a:avLst/>
                            </a:prstGeom>
                            <a:noFill/>
                          </pic:spPr>
                        </pic:pic>
                      </a:graphicData>
                    </a:graphic>
                  </wp:inline>
                </w:drawing>
              </w:r>
            </w:p>`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
