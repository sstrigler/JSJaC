OUTFILE=./jsjac.js

all: clean utils install doc

install: build crunch  
	@echo "done."

build: 
	@echo "building ...";
	@for i in src/*.js; do \
		if [ "$$i" != "src/JSJaC.js" ]; then \
			echo "\t$$i"; \
			cat "$$i" >> $(OUTFILE); \
		fi; \
	done

crunch: 
	@echo "crunching ..."
	@if [ -e $(OUTFILE) ]; then utils/jsmin < $(OUTFILE) > $(OUTFILE).tmp \
	"(c) 2005-2007 Stefan Strigler <steve@zeank.in-berlin.de>" && \
	mv $(OUTFILE).tmp $(OUTFILE); fi

doc: 
	@/opt/JSDoc/jsdoc.pl --project-name JSJaC -d doc src/

utils:
	@make -C utils
clean:
	@rm -f $(OUTFILE) 2>/dev/null
	@rm -rf doc/
	@make -C utils clean

.PHONY: doc utils
