OUTFILE=./jsjac.js
PACKFILE=./jsjac.packed.js
SRC=src/jsextras.js src/crypt.js src/json.js src/xmlextras.js \
src/JSJaCBuilder.js src/JSJaCConstants.js src/JSJaCConnection.js \
src/JSJaCConsoleLogger.js src/JSJaCCookie.js src/JSJaCError.js \
src/JSJaCJID.js src/JSJaCKeys.js src/JSJaCPacket.js \
src/JSJaCHttpBindingConnection.js src/JSJaCHttpPollingConnection.js 

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

pack: clean build
	@echo "packing..."
	@if [ -e $(OUTFILE) ]; then \
		php ./utils/packer/pack.php $(OUTFILE) $(PACKFILE).tmp && \
		cat src/JSJaCConfig.js > $(PACKFILE) && \
		cat $(PACKFILE).tmp >> $(PACKFILE) && \
		rm $(PACKFILE).tmp; \
	else \
		echo "$(OUTFILE) not found. build failed?"; \
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
