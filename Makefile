OUTFILE=./jsjac.js
SRC=src/jsextras.js src/crypt.js src/json.js src/xmlextras.js \
src/JSJaCBuilder.js src/JSJaCConstants.js src/JSJaCConnection.js \
src/JSJaCConsoleLogger.js src/JSJaCCookie.js src/JSJaCError.js \
src/JSJaCHttpBindingConnection.js src/JSJaCHttpPollingConnection.js \
src/JSJaCJID.js src/JSJaCKeys.js src/JSJaCPacket.js

all: clean utils install doc

install: build crunch  
	@echo "done."

build: 
	@echo "building ...";
	@for i in ${SRC}; do \
		echo "\t$$i"; \
		cat "$$i" >> $(OUTFILE); \
	done

crunch: 
	@echo "crunching ..."
	@if [ -e $(OUTFILE) ]; then \
		utils/jsmin < $(OUTFILE) > $(OUTFILE).tmp \
		"(c) 2005-2007 Stefan Strigler <steve@zeank.in-berlin.de>" && \
		cat src/JSJaCConfig.js > $(OUTFILE) && \
		cat $(OUTFILE).tmp >> $(OUTFILE) && \
		rm $(OUTFILE).tmp; \
	fi

doc: 
	@utils/JSDoc/jsdoc.pl --project-name JSJaC -d doc src/

utils:
	@make -C utils
clean:
	@rm -f $(OUTFILE) 2>/dev/null
	@rm -rf doc/
	@make -C utils clean

.PHONY: doc utils
