(ns callisto.front
  (:require ;[net.cgrand.enlive-html :as html]
   ;[clostache.parser]
   [hiccup.core :as hiccup]
   [hickory.core]
   ;        [pl.danieljanus.tagsoup]
            ))

(hiccup/html [:script])

;(html/deftemplate "/src/front/index.html")


(defn frontend []
  (hiccup/html (hickory.core/parse
  (slurp "resources/front/index.html")))
  )

