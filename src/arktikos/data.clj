(ns arktikos.data
  (:require [clojure.java.io :as io]
            [cheshire.core :as json]
            [arktikos.mail :as mail]
            [clj-time.core :as time]
            [clj-time.format]
            [clj-time.coerce]
            ))


;;;
;;; Data
;;;

;(defn first-date [msgs]
;  (:mail/date-sent
;   (first (sort-by #(:mail/date-sent %1) msgs))
;   ))

;(defn last-date [msgs]
;  (:mail/date-sent
;   (last (sort-by #(:mail/date-sent %1) msgs))
;   ))

;(defn subset-mail [msgs [date-start date-end]]
;  (filter
;   #(time/within? (interval (clj-time.format/parse date-start) (clj-time.format/parse date-end))
;       (clj-time.format/parse (:mail/date-sent %1)))
;   msgs))

(defn subset-mail-by-date [msgs date]
  (let [date (clj-time.format/parse date)]
    (filter
     #()
     msgs)))

;;;
;;; Nodes and Edges
;;;

(defn nodes-from-mail
  "Take the ingested emails and create a list of nodes, one for each address/player."
  [msgs]
  (sort (distinct (mapcat
                   (fn [m] (concat [(:mail/from m)] (:mail/reception-list m)))
                   msgs))))

(defn edges-from-mail
  "Take an email and create a list of messages sent,
  one from/to map per pair of correspodants."
  [msg]
  (map
   (fn [m]
     [(:mail/from msg) m])
   (:mail/reception-list msg)))

(defn mail-to-edges
  "Take the ingested emails and create a list of edges, each edge a
  a one-way link in the graph representing sent messages."
  [msgs]
  (sort (distinct (mapcat edges-from-mail msgs))))

(defn edge-weights
  "Given the list of edges and a message set, create a map of the count
  of messages per edge."
  [edges msgs]
  (zipmap edges
          (map (fn [edg] (count (filter
                                 (fn [a] (= a edg))
                                 (mapcat edges-from-mail msgs))))
               edges)))

(defn find-weight [edge weights]
  (get edge weights))

(defn node-weight-from
  "Given the list of nodes and a set of messages, create a map of the count of sent messages."
  [nodes msgs]
  (let [edges (mapcat edges-from-mail msgs)]
    (zipmap nodes
            (map (fn [nd]
                 (count (filter #(= (first %1) nd) edges) ))
               nodes))))

(defn node-weight-to
  "Given the list of nodes and a set of messages, create a map of the count of sent messages."
  [nodes msgs]
  (let [edges (mapcat edges-from-mail msgs)]
    (zipmap nodes
            (map (fn [nd]
                 (count (filter #(= (second %1) nd) edges) ))
               nodes))))

(defn elide-nodes
  "Given the set of nodes and a skip-list, return the nodes with the skipped nodes elided.
  Useful for looking at a subset of the players, or eliding the moderator."
  [nodes skip]
  (reduce (fn [nds skp] (remove #(= %1 skp) nds))
          nodes
          skip))

(defn mail-to-data
  "Takes the messages and translates them into an array for JSON export."
  [msgs indexed-nodes]
  (map (fn [msg] {:date (:mail/date-sent msg)
                :from (:mail/from msg)
                :to (:mail/reception-list msg)
                :subject (:mail/subject msg)
                :senderId (get indexed-nodes (:mail/from msg) 0)})
     msgs)
  )

;;;
;;; Encoding and JSON
;;;

(defn index-nodes [nodes]
  (apply hash-map (interleave nodes (range))))

(defn encode-nodes [nodes]
  (let [indexed-nodes (index-nodes nodes)]
    (map (fn [a] {:name a :index (get indexed-nodes a 0)}) nodes))
                        )

(defn named-edges-to-indexed [nodes edges]
  (let [n (index-nodes nodes)]
    (map
     (fn [[from to]] [(get n from) (get n to)])
          edges)))

(defn encode-edges
  ([nodes edges]
   (map (fn [[from to]]
          (if (not (or (nil? from) (nil? to)))
            {:target to, :source from, :value 1}))
        (named-edges-to-indexed nodes edges)))
  ([nodes edges weights]
   (map (fn [edg] (let [[[from to]]
                        (named-edges-to-indexed nodes [edg])]
                    (if (not (or (nil? from) (nil? to)))
                      {:target to,
                      :source from,
                      :value (get weights edg 0)
                      })))
       edges)))

(defn encode-mail [msgs]
  (let [nodes (elide-nodes (nodes-from-mail msgs) []);["Moderator" "INVALID ADDRESS"])
        edges (mail-to-edges msgs)
        eweights (edge-weights edges msgs)]
    {:nodes (encode-nodes nodes)
     :links (remove nil? (encode-edges nodes edges eweights))
     :data (mail-to-data msgs (index-nodes nodes))
     }))

(defn export-mail [msgs destination]
  (json/encode-stream
   (encode-mail msgs)
   (clojure.java.io/writer destination)
   {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd"}))

(defn broadcast-mail [msgs]
  (json/encode
   (encode-mail msgs)
   {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd"}))

;(encode-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
;      )

;(export-mail (mail/ingest-mail "mail/Book One_20150404-0926/messages/"))

