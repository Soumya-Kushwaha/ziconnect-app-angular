import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatStepper } from '@angular/material/stepper';
import * as moment from 'moment';
import { interval, Subscription } from 'rxjs';
import { DialogAnalysisFileRequirementsComponent, DialogAnalysisInputValidationResultComponent, DialogAnaysisResultComponent } from 'src/app/_components';
import { AnalysisInputType } from 'src/app/_helpers';
import { AnalysisGaEventName } from 'src/app/_helpers/enums/analysis-event-name';
import { AnalysisTaskStatus } from 'src/app/_helpers/enums/analysis-task-status';
import { AnalysisType } from 'src/app/_helpers/enums/analysis-type';
import { IAnalysisInputValidationResult, IDialogAnalysisResultData, IEmployabilityHomogenizeFeature } from 'src/app/_interfaces';
import { IAnalysisEventTrackParams } from 'src/app/_interfaces/analysis-event-track-params';
import { AnalysisTask } from 'src/app/_models';
import { AlertService, AnalysisInputDefinitionService, AnalysisToolService, SeoService } from 'src/app/_services';
import { AnalysisInputValidationService } from 'src/app/_services/analysis-input-validation/analysis-input-validation.service';

@Component({
  selector: 'app-analysis-tool',
  templateUrl: './analysis-tool.component.html',
  styleUrls: ['./analysis-tool.component.scss']
})
export class AnalysisToolComponent implements OnInit, OnDestroy {
  @ViewChild('sectionTypeSelection') sectionTypeSelection: ElementRef | undefined;
  @ViewChild('sectionAnalysisSteps') sectionAnalysisSteps: ElementRef | undefined;
  @ViewChild('analysisStepper') analysisStepper: MatStepper | undefined;


  public analysisTypeEnum: typeof AnalysisInputType = AnalysisInputType;
  public loadingInputValidation: boolean = false;
  public loadingPoolTask: boolean = false;
  public loadingStartTask: boolean = false;


  public selectedAnalysisType: AnalysisType | undefined = undefined;
  public selectedFile: File | undefined;
  public responseBody: any;
  public progress: number = 0;
  public storageTask?: AnalysisTask | null = null;
  public poolTaskSubscription!: Subscription;

  public statusCheckInterval: any;
  public statusCheckTimeLeft: number = 30;

  //#region  EMPLOYABILITY ANALYSIS CONFIG
  ////////////////////////////////////////////
  public isEmployabilityHomogenizeChecked: boolean = false;

  public employabilityHomogenizeFeatures: Array<IEmployabilityHomogenizeFeature> = new Array<IEmployabilityHomogenizeFeature>();

  public connectivityVariationThresholdsA: Array<number> = [2.0, 1.8, 1.6];
  public connectivityVariationThresholdA: number = 2.0;

  public connectivityVariationThresholdsB: Array<number> = [1.0, 1.1, 1.15];
  public connectivityVariationThresholdB: number = 1.0;

  public employbilitySetupFormGroup: FormGroup = new FormGroup({
    municipalitiesThreshold: new FormControl(3, [Validators.required, Validators.min(0.1), Validators.max(100)])
  });
  ////////////////////////////////////////////
  //#endregion

  //#region FILES
  ////////////////////////////////////////////
  @ViewChild('schoolFileDropRef') schoolFileDropRef: ElementRef | undefined;
  public schoolFile: File | undefined;
  public schoolFileIsValid: boolean = false;
  public schoolFileValidationResult: Array<IAnalysisInputValidationResult> = new Array<IAnalysisInputValidationResult>();

  @ViewChild('localityFileDropRef') localityFileDropRef: ElementRef | undefined;
  public localityFile: File | undefined;
  public localityFileIsValid: boolean = false;
  public localityFileValidationResult: Array<IAnalysisInputValidationResult> = new Array<IAnalysisInputValidationResult>();

  @ViewChild('schoolHistoryFileDropRef') schoolHistoryFileDropRef: ElementRef | undefined;
  public schoolHistoryFile: File | undefined;
  public schoolHistoryFileIsValid: boolean = false;
  public schoolHistoryFileValidationResult: Array<IAnalysisInputValidationResult> = new Array<IAnalysisInputValidationResult>();

  @ViewChild('localityEmployabilityFileDropRef') localityEmployabilityFileDropRef: ElementRef | undefined;
  public localityEmployabilityFile: File | undefined;
  public localityEmployabilityFileIsValid: boolean = false;
  public localityEmployabilityFileValidationResult: Array<IAnalysisInputValidationResult> = new Array<IAnalysisInputValidationResult>();
  ////////////////////////////////////////////
  //#endregion

  constructor(private _alertService: AlertService,
    private _analysisToolService: AnalysisToolService,
    private ref: ChangeDetectorRef,
    private _dialogService: MatDialog,
    private _analysisInputDefinitionService: AnalysisInputDefinitionService,
    private _analysisInputValidationService: AnalysisInputValidationService,
    private _seoService: SeoService) { }


  //#region Component initialization functions
  ////////////////////////////////////////////
  ngOnDestroy(): void {
    if (this.poolTaskSubscription) {
      this.poolTaskSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.selectedFile = undefined;
  }

  loadStorageTask() {
    if (this.selectedAnalysisType) {
      this.storageTask = null;
      const analysisTypeStr = AnalysisType[this.selectedAnalysisType];

      const storageTask = localStorage.getItem(`${analysisTypeStr}_task`);

      if (storageTask) {
        let analysisTask = new AnalysisTask().fromLocalStorage(JSON.parse(storageTask));
        this.storageTask = analysisTask;
      }
    }
  }
  ////////////////////////////////////////////
  //#endregion

  //#region Button Events
  ////////////////////////////////////////////
  onButtonNextClick() {
    if (this.analysisStepper) {
      if (this.analysisStepper.selected) {
        this.analysisStepper.selected.completed = true;
      }

      this.analysisStepper.next();
    }
  }

  onButtonRemoveFileClick(filePropertyName: string) {
    this.analysisStepper?.reset();

    (this as any)[filePropertyName] = undefined;
    if ((this as any)[`${filePropertyName}DropRef`]) {
      (this as any)[`${filePropertyName}DropRef`].nativeElement.value = '';
    }

    if ((this as any)[`${filePropertyName}IsValid`]) {
      (this as any)[`${filePropertyName}IsValid`] = false;
    }

    if ((this as any)[`${filePropertyName}ValidationResult`]) {
      (this as any)[`${filePropertyName}ValidationResult`] = new Array<IAnalysisInputValidationResult>();
    }
  }

  onButtonRemoveStorageValueClick() {
    if (this.selectedAnalysisType) {
      const analysisTypeStr = AnalysisType[this.selectedAnalysisType];

      localStorage.removeItem(`${analysisTypeStr}_task`);

      this.onSelectAnalysisTypeClick(this.selectedAnalysisType);
    }
  }

  onButtonRetryCheckStatusClick() {
    if (this.storageTask) {
      this.storageTask.statusCheckCode = 0;
      this.storageTask.statusCheckMessage = '';
    }

    if (this.poolTaskSubscription && this.poolTaskSubscription.closed) {
      this.poolStorageTask();
    }
  }

  onButtonStartAnalysisClick() {
    if (this.selectedAnalysisType === AnalysisType.ConnectivityPrediction) {
      this.startNewPredictionAnalysis();
    }

    if (this.selectedAnalysisType === AnalysisType.EmployabilityImpact) {
      this.startNewEmployabilityImpactAnalysis();
    }
  }

  onButtonViewValidationResultsClick() {
    this._dialogService.open(DialogAnalysisInputValidationResultComponent, {
      autoFocus: false,
      maxHeight: '90vh',
      maxWidth: '1440px',
      width: '100%',
      data: {
        analysisTask: this.storageTask,
        analysisType: this.selectedAnalysisType
      } as IDialogAnalysisResultData
    });
  }

  onButtonViewResultsClick() {
    if (this.selectedAnalysisType && this.storageTask) {
      this._dialogService.open(DialogAnaysisResultComponent, {
        autoFocus: false,
        maxHeight: '90vh',
        maxWidth: '90vw',
        width: '100%',
        data: {
          analysisTask: this.storageTask,
          analysisType: this.selectedAnalysisType
        } as IDialogAnalysisResultData
      });
    }
  }
  ////////////////////////////////////////////
  //#endregion

  //#region Upload Files Handlers
  ////////////////////////////////////////////
  onFileBrowserHandler($event: any, filePropertyName: string) {
    if ($event && $event.target && $event.target.files && $event.target.files.length > 0) {
      (this as any)[filePropertyName] = $event.target.files[0];
    }
  }

  onFileDropped(files: FileList, filePropertyName: string) {
    if (files.length === 0) {
      this._alertService.showWarning('Upload file not provided');
    } else if (files.length > 1) {
      this._alertService.showWarning('Only one file is allowed');
      return;
    }

    (this as any)[filePropertyName] = files[0];
  }

  onFileRequirementsClick(analysisInputType: AnalysisInputType) {
    this._dialogService.open(DialogAnalysisFileRequirementsComponent, {
      width: '100%',
      data: analysisInputType
    });
  }
  ////////////////////////////////////////////
  //#endregion

  //#region Util Functions
  ////////////////////////////////////////////

  checkFormErrors(formGroup: FormGroup, controlName: string, errorName: string) {
    return formGroup.controls[controlName].hasError(errorName);
  }

  loadEmployabilityHomogenizeFeatures() {
    this._analysisInputDefinitionService
      .getAnalysisInputDefinition(AnalysisInputType.LocalityEmployability)
      .subscribe((data) => {
        this.employabilityHomogenizeFeatures = data.filter(x => x.canHomogenize).map((item) => {
          return {
            name: item.column,
            checked: false,
            disabled: false
          } as IEmployabilityHomogenizeFeature;
        })
      }, (error) => {
        this._alertService.showError('Something went wrong loading features: ' + error.message);
      });
  }

  onEmployabilityHomogenizeCheckChange(event: MatSlideToggleChange) {
    if (event.checked && this.employabilityHomogenizeFeatures.length === 0) {
      this.loadEmployabilityHomogenizeFeatures();
    }

    if (!event.checked) {
      this.employabilityHomogenizeFeatures = new Array<IEmployabilityHomogenizeFeature>();
    }
  }

  async onStepSelectionChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === 1 && event.previouslySelectedIndex === 0) {
      this.loadingInputValidation = true;

      //VALIDATE INPUTS
      if (this.schoolFile) {
        const result = await this._analysisInputValidationService.validateSchoolInputFile(this.schoolFile);
        if (result.length > 0) {
          this.schoolFileIsValid = result.every(item => item.valid);
          this.schoolFileValidationResult = result;
        }
      }

      if (this.schoolHistoryFile) {
        const result = await this._analysisInputValidationService.validateSchoolHistoryInputFile(this.schoolHistoryFile);
        if (result.length > 0) {
          this.schoolHistoryFileIsValid = result.every(item => item.valid);
          this.schoolHistoryFileValidationResult = result;
        }
      }

      if (this.localityFile) {
        const result = await this._analysisInputValidationService.validateLocalityInputFile(this.localityFile);
        if (result.length > 0) {
          this.localityFileIsValid = result.every(item => item.valid);
          this.localityFileValidationResult = result;
        }
      }

      if (this.localityEmployabilityFile) {
        const result = await this._analysisInputValidationService.validateLocalityEmployabilityInputFile(this.localityEmployabilityFile);
        if (result.length > 0) {
          this.localityEmployabilityFileIsValid = result.every(item => item.valid);
          this.localityEmployabilityFileValidationResult = result;
        }
      }

      this.loadingInputValidation = false;
    }
  }

  poolStorageTask() {
    if (this.storageTask) {
      const timer = interval(30000);

      this.startStatusCheckCountdown();

      this.poolTaskSubscription = timer.subscribe(() => {
        this.statusCheckTimeLeft = 30;
        this.loadingPoolTask = true;

        this._analysisToolService
          .getTaskInfo(this.storageTask ? this.storageTask.id.toString() : '')
          .subscribe(data => {
            this.loadingPoolTask = false;
            this.storageTask = data;
            this.storageTask.statusCheckCode = 200;
            this.storageTask.statusCheckMessage = '';

            this.putAnalysisTaskOnStorage(this.storageTask);

            if ([AnalysisTaskStatus.Success, AnalysisTaskStatus.Failure, AnalysisTaskStatus.SchemaError].includes(this.storageTask.status)) {
              this.poolTaskSubscription.unsubscribe();
              this.stopStatusCheckCountdown();
            }
          }, error => {
            this.stopStatusCheckCountdown();
            const errorMessage = `Something went wrong getting the analysis data: ${error.message}`;

            this.loadingPoolTask = false;
            this._alertService.showError(errorMessage);
            this.poolTaskSubscription.unsubscribe();

            // Update status checked at
            if (this.storageTask) {
              this.storageTask.statusCheckedAt = moment();
              this.storageTask.statusCheckCode = error.status || 500;
              this.storageTask.statusCheckMessage = errorMessage;

              if (error.status === 404) {
                this.storageTask.statusCheckMessage = `We were unable to locate your analysis, or its storage time has expired. You can either discard it and start a new analysis.`;
              }

              this.putAnalysisTaskOnStorage(this.storageTask);
            }
          });
      });
    }
  }

  putAnalysisTaskOnStorage(analysisTask: AnalysisTask) {
    if (this.selectedAnalysisType) {
      const analysisTypeStr = AnalysisType[this.selectedAnalysisType];

      localStorage.setItem(`${analysisTypeStr}_task`, analysisTask.toLocalStorageString());

      this.storageTask = analysisTask;
    }
  }

  removeAnalysisResultFromStorage() {
    if (this.selectedAnalysisType) {
      const analysisTypeStr = AnalysisType[this.selectedAnalysisType];

      localStorage.removeItem(`${analysisTypeStr}_result`);
    }
  }

  scrollToSection(sectionElementName: string): void {
    const elementRef = (this as any)[sectionElementName] as ElementRef;

    if (elementRef) {
      const yOffset = -60; // ajuste o valor para a posição desejada
      const element = elementRef.nativeElement;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  startStatusCheckCountdown() {
    if (!this.statusCheckInterval) {
      this.statusCheckTimeLeft = 30;

      this.statusCheckInterval = setInterval(() => {
        if (this.statusCheckTimeLeft > 0) {
          this.statusCheckTimeLeft--;
        } else {
          this.statusCheckTimeLeft = 0;
          this.stopStatusCheckCountdown();
        }
      }, 1000);
    }
  }

  stopStatusCheckCountdown() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  getContactUsBodyErrorMessage() {
    let message = '';

    if (this.selectedAnalysisType && this.storageTask && this.storageTask.status === AnalysisTaskStatus.Failure) {
      message += `Analysis Type: ${AnalysisType[this.selectedAnalysisType]}`;
      message += '%0D%0A' // Adds break line
      message += `Analysis Task ID: ${this.storageTask.id}`;
      message += '%0D%0A%0D%0A' // Adds break line
      message += 'Exception Message:';
      message += '%0D%0A%0D%0A' // Adds break line
      message += this.storageTask.exception ? this.storageTask.exception.exceptionMessage : 'Task execution general error!';
    }

    return message;
  }

  get checkedEmployabilityFeaturesLength() {
    return this.employabilityHomogenizeFeatures.filter(x => x.checked).length;
  }
  ////////////////////////////////////////////
  //#endregion

  //#region Analysis handlers
  ////////////////////////////////////////////
  onSelectAnalysisTypeClick(type: AnalysisType) {
    this.selectedAnalysisType = type;
    this.analysisStepper?.reset();

    this.initNewAnalysis();

    this.loadStorageTask();

    if (!this.storageTask) {
      this.ref.detectChanges();

      this.scrollToSection('sectionAnalysisSteps');
    } else if (![AnalysisTaskStatus.Success, AnalysisTaskStatus.Failure, AnalysisTaskStatus.SchemaError].includes(this.storageTask.status)) {
      this.poolStorageTask();
    }
  }

  initNewAnalysis() {
    this.localityFile = undefined;
    this.localityEmployabilityFile = undefined;
    this.schoolHistoryFile = undefined;
    this.schoolFile = undefined;
    this.storageTask = null;
    this.progress = 0;

    this.isEmployabilityHomogenizeChecked = false;
    this.employabilityHomogenizeFeatures = new Array<IEmployabilityHomogenizeFeature>();

    this.stopStatusCheckCountdown();

    if (this.poolTaskSubscription) {
      this.poolTaskSubscription.unsubscribe();
    }

    if (this.schoolFileDropRef) {
      this.schoolFileDropRef.nativeElement.value = '';
    }

    if (this.schoolHistoryFileDropRef) {
      this.schoolHistoryFileDropRef.nativeElement.value = '';
    }

    if (this.localityFileDropRef) {
      this.localityFileDropRef.nativeElement.value = '';
    }

    if (this.localityEmployabilityFileDropRef) {
      this.localityEmployabilityFileDropRef.nativeElement.value = '';
    }
  }

  startNewPredictionAnalysis() {
    if (!this.schoolFile || !this.localityFile) {
      this._alertService.showWarning('One or more input file were not provided!');
      return;
    }

    this.loadingStartTask = true;
    this.progress = 0;

    this._analysisToolService
      .postNewPredictionAnalysis(this.schoolFile, this.localityFile)
      .subscribe((event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.progress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          if (event.body && event.body.task_id) {
            let analysisTask = new AnalysisTask();
            analysisTask.id = event.body.task_id;

            if (this.selectedAnalysisType) {
              // SEND GOOGLE ANALYTICS ANALYSIS EVENT TRACKING
              this._seoService.gaAnalysisEventTrack({
                eventName: AnalysisGaEventName.AnalisysStartNew,
                analysisType: this.selectedAnalysisType,
                analysisTaskId: analysisTask.id
              } as IAnalysisEventTrackParams);

              this.removeAnalysisResultFromStorage();
              this.putAnalysisTaskOnStorage(analysisTask);
              this.poolStorageTask();
            }

            this.loadingStartTask = false;
          }
        }
      }, (error: any) => {
        this.loadingStartTask = false;
        this._alertService.showError('Something went wrong starting new analysis: ' + error.message);

        // SEND GOOGLE ANALYTICS ANALYSIS EVENT TRACKING
        this._seoService.gaAnalysisEventTrack({
          eventName: AnalysisGaEventName.AnalisysStartNewError,
          analysisType: this.selectedAnalysisType,
          analysisTaskId: null
        } as IAnalysisEventTrackParams);
      });
  }

  startNewEmployabilityImpactAnalysis() {
    if (!this.schoolHistoryFile || !this.localityEmployabilityFile) {
      this._alertService.showWarning('One or more input file were not provided!');
      return;
    }

    if (!this.employbilitySetupFormGroup.valid) {
      this._alertService.showWarning('Some setup values are invalid!');
      return;
    }

    this.loadingStartTask = true;
    this.progress = 0;

    const homogenizeColumns = this.employabilityHomogenizeFeatures.filter(x => x.checked).map(x => x.name);
    const numMunicipalitiesThreshold = this.employbilitySetupFormGroup.controls.municipalitiesThreshold.value / 100 as number;

    this._analysisToolService
      .postNewEmployabilityImpactAnalysis(
        this.schoolHistoryFile,
        this.localityEmployabilityFile,
        homogenizeColumns,
        this.connectivityVariationThresholdA,
        this.connectivityVariationThresholdB,
        numMunicipalitiesThreshold)
      .subscribe((event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.progress = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          if (event.body && event.body.task_id) {
            let analysisTask = new AnalysisTask();
            analysisTask.id = event.body.task_id;

            if (this.selectedAnalysisType) {
              // SEND GOOGLE ANALYTICS ANALYSIS EVENT TRACKING
              this._seoService.gaAnalysisEventTrack({
                eventName: AnalysisGaEventName.AnalisysStartNew,
                analysisType: this.selectedAnalysisType,
                analysisTaskId: analysisTask.id,
                analysisConnectivityThresholdA: this.connectivityVariationThresholdA,
                analysisConnectivityThresholdB: this.connectivityVariationThresholdB,
                analysisMunicipalitiesThreshold: numMunicipalitiesThreshold
              } as IAnalysisEventTrackParams);

              this.removeAnalysisResultFromStorage();
              this.putAnalysisTaskOnStorage(analysisTask);
              this.poolStorageTask();
            }

            this.loadingStartTask = false;
          }
        }
      }, (error: any) => {
        this.loadingStartTask = false;
        this._alertService.showError('Something went wrong starting new analysis: ' + error.message);

        // SEND GOOGLE  ANALYTICS ANALYSIS EVENT TRACKING
        this._seoService.gaAnalysisEventTrack({
          eventName: AnalysisGaEventName.AnalisysStartNewError,
          analysisType: this.selectedAnalysisType,
          analysisTaskId: null,
          analysisConnectivityThresholdA: this.connectivityVariationThresholdA,
          analysisConnectivityThresholdB: this.connectivityVariationThresholdB,
          analysisMunicipalitiesThreshold: numMunicipalitiesThreshold
        } as IAnalysisEventTrackParams);
      });
  }
  ////////////////////////////////////////////
  //#endregion
}
