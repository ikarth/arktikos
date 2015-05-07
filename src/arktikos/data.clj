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


;;;
;;; Dates
;;;


;; joda.time has a withTimeAtStartOfDay() method, but clj-time doesn't implement that (yet)
(defn get-start-of-day [date]
  (clj-time.core/date-time
   (clj-time.core/year date)
   (clj-time.core/month date)
   (clj-time.core/day date)))

(defn get-message-date [msg]
  (clj-time.coerce/from-date (:mail/date-sent msg)))

(defn get-message-day [msg]
  (get-start-of-day (get-message-date msg)))

(defn get-days-from-messages
  "given a seq of messages, get a list of dates."
  [msgs]
  (distinct (map get-message-day msgs)))

(defn subset-mail-by-dates [msgs start end]
  (filter
     (fn [m]
       (clj-time.core/within?
         start
         end
         (get-message-date m)))
     msgs))

(defn subset-mail-by-date [msgs date]
  (let [start (get-start-of-day date)
        end (clj-time.core/plus start (clj-time.core/days 1))
        ]
    (subset-mail-by-dates msgs start end)))


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

(defn edge-weights-drop-zero
  "Given the list of edges and a message set, create a map of the count
  of messages per edge. Omits 0 count edges."
  [edges msgs]
  (filter #(< 0 (second %1))
  (zipmap edges
          (map (fn [edg] (count (filter
                                 (fn [a] (= a edg))
                                 (mapcat edges-from-mail msgs))))
               edges))))

(defn find-weight [edge weights]
  (get edge weights))

(defn edge-weights-per-date
  "Given a list of edges and a message set, create a map of the count of messages per
  edge per date."
  [edges msgs]
  (let [days (get-days-from-messages msgs)]
    (zipmap
     days ;(map clj-time.coerce/to-date days)
     (map (fn [d] (edge-weights-drop-zero edges (subset-mail-by-date msgs d))) days))))

(edge-weights-per-date
 (mapcat edges-from-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/"))
 (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
      )

;(let [msgs (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
;      edges (mail-to-edges msgs)]
;  (edge-weights-per-date edges msgs (clj-time.core/date-time 2014 4 9))
;  )

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
  (map (fn [msg] {:messageId (hash (:mail/id msg))
                  :date (:mail/date-sent msg)
                :from (:mail/from msg)
                :to (:mail/reception-list msg)
                :subject (:mail/subject msg)
                :senderId (get indexed-nodes (:mail/from msg) 0)
                :targetIds (map #(get indexed-nodes %1 0) (:mail/reception-list msg))
                  })
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

(defn encode-date-edge-count [[[f t] c] nodes]
  (let []
    {;:target-name t;(get nodes t)
     :target (get nodes t)
     ;:source-name f
     :source (get nodes f)
     :count c}
    ))

(defn encode-mail-per-date [msgs nodes]
  ;(filter
  ; #(> (:count (:counts %1)) 0)
  (let [n (index-nodes nodes)]
   (map
    (fn [i] {:date (clj-time.coerce/to-date (first i))
             :counts (map #(encode-date-edge-count %1 n)
                            (second i))
             })
    (edge-weights-per-date (mapcat edges-from-mail msgs) msgs))))
;)


(defn encode-mail [msgs]
  (let [nodes (nodes-from-mail msgs)
        edges (mail-to-edges msgs)
        eweights (edge-weights edges msgs)]
    {:nodes (encode-nodes nodes)
     :links (remove nil? (encode-edges nodes edges eweights))
     :data (mail-to-data msgs (index-nodes nodes))
     :dates (encode-mail-per-date msgs nodes)
     }))

(defn export-mail [msgs destination]
  (json/encode-stream
   (encode-mail msgs)
   (clojure.java.io/writer destination)
   {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd"}))

(defn broadcast-mail [msgs]
  (json/encode
   (encode-mail msgs)
   {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd-HH-mm-ss"}))

;(encode-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
;      )

;(export-mail (mail/ingest-mail "mail/Book One_20150404-0926/messages/"))

;(get {})

;(nodes-from-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
;                 )

(encode-mail-per-date (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
                      (nodes-from-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/"))
                      )

(json/generate-string
 (encode-mail-per-date (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
                      (nodes-from-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/"))
                      )
  {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd-HH-mm-ss"}
 )

;(json/generate-string
; (map
;   (fn [n] {:date (clj-time.coerce/to-date (first n)) :counts (second n)})
;   (edge-weights-per-date
;    (mapcat edges-from-mail (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/"))
;    (mail/ingest-mail "resources/mail/Book One_20150404-0926/messages/")
;          ))
; {:pretty true :escape-non-ascii true :date-format "yyyy-MM-dd-HH-mm-ss"}
; )
