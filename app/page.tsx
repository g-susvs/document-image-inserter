"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, ImageIcon, Download, Loader2, CheckCircle, Shield, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ImagePreview } from "@/components/image-preview"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function WordImageInserter() {
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [beforeImages, setBeforeImages] = useState<File[]>([])
  const [afterImages, setAfterImages] = useState<File[]>([])
  const [sectionMarker, setSectionMarker] = useState("{{IMAGENES}}")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedDocument, setProcessedDocument] = useState<Blob | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const { toast } = useToast()

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      setWordFile(file)
      setProcessedDocument(null)
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo .docx válido",
        variant: "destructive",
      })
    }
  }

  const handleBeforeImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length !== files.length) {
      toast({
        title: "Advertencia",
        description: "Algunos archivos no son imágenes y fueron omitidos",
        variant: "destructive",
      })
    }

    setBeforeImages(imageFiles)
    setProcessedDocument(null)
  }

  const handleAfterImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length !== files.length) {
      toast({
        title: "Advertencia",
        description: "Algunos archivos no son imágenes y fueron omitidos",
        variant: "destructive",
      })
    }

    setAfterImages(imageFiles)
    setProcessedDocument(null)
  }

  const processDocument = async () => {
    if (!wordFile || (beforeImages.length === 0 && afterImages.length === 0)) {
      toast({
        title: "Error",
        description: "Por favor selecciona un documento Word y al menos una imagen",
        variant: "destructive",
      })
      return
    }

    if (beforeImages.length !== afterImages.length) {
      toast({
        title: "Advertencia",
        description: `Tienes ${beforeImages.length} imágenes del "antes" y ${afterImages.length} del "después". Se emparejarán las que coincidan.`,
      })
    }

    setIsProcessing(true)
    setProcessingStatus("Leyendo estructura del documento original...")

    try {
      const formData = new FormData()
      formData.append("wordFile", wordFile)
      formData.append("sectionMarker", sectionMarker)

      // Enviar imágenes del antes
      beforeImages.forEach((image, index) => {
        formData.append(`before_${index}`, image)
      })

      // Enviar imágenes del después
      afterImages.forEach((image, index) => {
        formData.append(`after_${index}`, image)
      })

      setProcessingStatus("Organizando comparaciones antes/después...")

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      })

      // Check if response is ok first
      if (!response.ok) {
        let errorMessage = "Error al procesar el documento"

        try {
          // Try to parse as JSON first
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            errorMessage = `Error del servidor (${response.status}): ${response.statusText}`
          }
        }

        throw new Error(errorMessage)
      }

      setProcessingStatus("Insertando comparaciones sin alterar el contenido...")

      const blob = await response.blob()
      setProcessedDocument(blob)

      const totalComparisons = Math.max(beforeImages.length, afterImages.length)
      toast({
        title: "¡Perfecto!",
        description: `Documento procesado exitosamente. Se crearon ${totalComparisons} comparaciones antes/después conservando TODO el contenido original.`,
      })

      setProcessingStatus("")
    } catch (error) {
      console.error("Processing error:", error)
      toast({
        title: "Error",
        description: (error as Error).message || "Error al procesar el documento",
        variant: "destructive",
      })
      setProcessingStatus("")
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadDocument = () => {
    if (!processedDocument) return

    const url = URL.createObjectURL(processedDocument)
    const a = document.createElement("a")
    a.href = url
    a.download = `${wordFile?.name?.replace(".docx", "") || "documento"}_antes_despues.docx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const removeBeforeImage = (index: number) => {
    setBeforeImages(beforeImages.filter((_, i) => i !== index))
    setProcessedDocument(null)
  }

  const removeAfterImage = (index: number) => {
    setAfterImages(afterImages.filter((_, i) => i !== index))
    setProcessedDocument(null)
  }

  const totalComparisons = Math.max(beforeImages.length, afterImages.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Comparador Antes/Después en Word</h1>
          <p className="text-gray-600">Crea comparaciones visuales lado a lado conservando todo el formato original</p>
        </div>

        {/* Alert de garantía de preservación */}
        <Alert className="bg-green-50 border-green-200">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Comparaciones automáticas:</strong> Sube las imágenes del "antes" y "después" por separado. El
            programa las organizará automáticamente lado a lado manteniendo el orden. Solo se reemplaza el marcador{" "}
            <code className="bg-green-100 px-1 rounded">{sectionMarker}</code> por las comparaciones.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Subir Archivos</TabsTrigger>
            <TabsTrigger value="instructions">Guía de Comparaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Documento Word */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documento Original
                  </CardTitle>
                  <CardDescription>Tu documento Word (.docx) donde se insertarán las comparaciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="word-file">Archivo Word (.docx)</Label>
                      <Input
                        id="word-file"
                        type="file"
                        accept=".docx"
                        onChange={handleWordFileChange}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-marker">Marcador de Inserción</Label>
                      <Input
                        id="section-marker"
                        value={sectionMarker}
                        onChange={(e) => setSectionMarker(e.target.value)}
                        placeholder="{{IMAGENES}}"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {wordFile && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-green-700">{wordFile.name}</span>
                        <p className="text-xs text-green-600">
                          Tamaño: {(wordFile.size / 1024).toFixed(1)} KB | Contenido protegido ✓
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Imágenes del antes y después */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Imágenes del ANTES */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Imágenes del ANTES
                    </CardTitle>
                    <CardDescription>Sube las imágenes del estado inicial en el orden deseado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="before-images">Seleccionar Imágenes del Antes</Label>
                      <Input
                        id="before-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBeforeImagesChange}
                        className="mt-1"
                      />
                    </div>

                    {beforeImages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-blue-700">{beforeImages.length} imagen(es) del ANTES:</p>
                        <ImagePreview images={beforeImages} onRemoveImage={removeBeforeImage} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Imágenes del DESPUÉS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-green-600" />
                      Imágenes del DESPUÉS
                    </CardTitle>
                    <CardDescription>Sube las imágenes del estado final en el mismo orden</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="after-images">Seleccionar Imágenes del Después</Label>
                      <Input
                        id="after-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAfterImagesChange}
                        className="mt-1"
                      />
                    </div>

                    {afterImages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-700">
                          {afterImages.length} imagen(es) del DESPUÉS:
                        </p>
                        <ImagePreview images={afterImages} onRemoveImage={removeAfterImage} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Resumen de comparaciones */}
              {(beforeImages.length > 0 || afterImages.length > 0) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{beforeImages.length}</div>
                        <div className="text-sm text-blue-700">Antes</div>
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-400" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{afterImages.length}</div>
                        <div className="text-sm text-green-700">Después</div>
                      </div>
                      <div className="text-center ml-4">
                        <div className="text-2xl font-bold text-purple-600">{totalComparisons}</div>
                        <div className="text-sm text-purple-700">Comparaciones</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="instructions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cómo funciona el comparador</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-blue-700">📋 Proceso paso a paso:</h4>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            1
                          </span>
                          <div>
                            <p className="text-sm font-medium">Sube tu documento Word</p>
                            <p className="text-xs text-gray-600">Con el marcador donde quieres las comparaciones</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            2
                          </span>
                          <div>
                            <p className="text-sm font-medium">Sube imágenes del ANTES</p>
                            <p className="text-xs text-gray-600">En el orden que quieres que aparezcan</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            3
                          </span>
                          <div>
                            <p className="text-sm font-medium">Sube imágenes del DESPUÉS</p>
                            <p className="text-xs text-gray-600">En el mismo orden que las del antes</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            4
                          </span>
                          <div>
                            <p className="text-sm font-medium">Procesa el documento</p>
                            <p className="text-xs text-gray-600">Se crearán las comparaciones automáticamente</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-green-700">✅ Resultado esperado:</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border text-sm">
                        <div className="space-y-3">
                          <p className="font-semibold text-center">Comparaciones Antes/Después</p>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="text-center">
                              <div className="bg-blue-100 p-2 rounded mb-1">
                                <strong>ANTES</strong>
                              </div>
                              <div className="bg-gray-200 h-12 rounded mb-1 flex items-center justify-center">
                                Imagen 1
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="bg-green-100 p-2 rounded mb-1">
                                <strong>DESPUÉS</strong>
                              </div>
                              <div className="bg-gray-200 h-12 rounded mb-1 flex items-center justify-center">
                                Imagen 1
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="bg-gray-200 h-12 rounded mb-1 flex items-center justify-center">
                                Imagen 2
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="bg-gray-200 h-12 rounded mb-1 flex items-center justify-center">
                                Imagen 2
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  <strong>Consejo importante:</strong> Asegúrate de subir las imágenes en el mismo orden en ambos
                  grupos. La primera imagen del "antes" se emparejará con la primera del "después", y así sucesivamente.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        {/* Estado del procesamiento */}
        {isProcessing && processingStatus && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">{processingStatus}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={processDocument}
            disabled={!wordFile || (beforeImages.length === 0 && afterImages.length === 0) || isProcessing}
            className="flex items-center gap-2"
            size="lg"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isProcessing ? "Procesando..." : "Crear Comparaciones"}
          </Button>

          {processedDocument && (
            <Button onClick={downloadDocument} variant="outline" className="flex items-center gap-2" size="lg">
              <Download className="w-4 h-4" />
              Descargar Documento con Comparaciones
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
