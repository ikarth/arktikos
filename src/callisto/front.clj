(ns callisto.front
  (:require [hiccup.core :as hiccup]
            [hickory.core]
            ))

(hiccup/html [:script])

(defn frontend []
  (hiccup/html (hickory.core/parse
                 (slurp "resources/front/index.html"))))

