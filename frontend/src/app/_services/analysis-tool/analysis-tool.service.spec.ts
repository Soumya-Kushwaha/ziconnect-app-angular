import { HttpEventType } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { skipWhile } from 'rxjs/operators';
import { AnalysisType } from 'src/app/_helpers';
import { AnalysisTask } from 'src/app/_models';
import { AnalysisResult } from 'src/app/_models/analysis-result/analysis-result.model';
import { environment } from 'src/environments/environment';
import { analysisResultFromServer } from '../../../test/analysis-result';

import { AnalysisToolService } from './analysis-tool.service';

describe('AnalysisToolService', () => {
  let service: AnalysisToolService;
  let httpTestingController: HttpTestingController;

  let endpointGetTaskInfoUri = '';
  let endpointGetTaskResulUri = '';
  let endpointPostPredictionTaskUri = '';
  let endpointPostEmployabilityImpactTaskUri = '';

  const taskFromServer = {
    "task_id": "b5ab72ba-998a-4a4f-bc90-83a7114b16c4",
    "task_status": "PENDING",
    "task_result": null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: []
    });

    httpTestingController = TestBed.inject(HttpTestingController);

    service = TestBed.inject(AnalysisToolService);

    //@ts-ignore
    endpointGetTaskInfoUri = `${environment.fastApiHost}${service._taskInfoPath}`;
    //@ts-ignore
    endpointGetTaskResulUri = `${environment.fastApiHost}${service._taskResultPath}`;
    //@ts-ignore
    endpointPostPredictionTaskUri = `${environment.fastApiHost}${service._taskPredictionPath}`;
    //@ts-ignore
    endpointPostEmployabilityImpactTaskUri = `${environment.fastApiHost}${service._taskEmployabilityImpactPath}`;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('#getTaskInfo', () => {
    it('should exists', () => {
      expect(service.getTaskInfo).toBeDefined();
      expect(service.getTaskInfo).toEqual(jasmine.any(Function));
    });

    it('should use GET to retrieve data', () => {
      service.getTaskInfo(taskFromServer.task_id).subscribe();

      const testRequest = httpTestingController.expectOne(`${endpointGetTaskInfoUri}/${taskFromServer.task_id}`);
      expect(testRequest.request.method).toEqual('GET');
    });

    it('should return expected data', (done) => {
      const expectedData: AnalysisTask = new AnalysisTask().deserialize(taskFromServer);

      service.getTaskInfo(taskFromServer.task_id).subscribe(data => {
        expect(data.id).toEqual(expectedData.id);
        expect(data.status).toEqual(expectedData.status);
        done();
      });

      const testRequest = httpTestingController.expectOne(`${endpointGetTaskInfoUri}/${taskFromServer.task_id}`);
      testRequest.flush(taskFromServer);
    });
  });

  describe('#getTaskResult', () => {
    it('should exists', () => {
      expect(service.getTaskResult).toBeDefined();
      expect(service.getTaskResult).toEqual(jasmine.any(Function));
    });

    it('should use GET to retrieve data', () => {
      service.getTaskResult(taskFromServer.task_id, AnalysisType.ConnectivityPrediction).subscribe();

      const testRequest = httpTestingController.expectOne(`${endpointGetTaskResulUri}/${taskFromServer.task_id}`);
      expect(testRequest.request.method).toEqual('GET');
    });

    it('should return expected data', (done) => {
      const taskResult = analysisResultFromServer.taskResult;
      const expectedData: AnalysisResult = new AnalysisResult().deserialize(taskResult);

      service.getTaskResult(taskFromServer.task_id, AnalysisType.ConnectivityPrediction).subscribe(data => {
        expect(data.modelMetrics).toBeDefined();
        expect(data.resultSummary).toBeDefined();
        done();
      });

      const testRequest = httpTestingController.expectOne(`${endpointGetTaskResulUri}/${taskFromServer.task_id}`);
      testRequest.flush(analysisResultFromServer);
    });
  });

  describe('#getTaskResultFromStorage', () => {
    it('should exists', () => {
      expect(service.getTaskResultFromStorage).toBeDefined();
      expect(service.getTaskResultFromStorage).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const taskResult = analysisResultFromServer.taskResult;
      const analysisResult: AnalysisResult = new AnalysisResult().deserialize(taskResult);

      spyOn(window.localStorage, 'getItem').and.returnValue(JSON.stringify(analysisResult));

      const result = service.getTaskResultFromStorage(AnalysisType.ConnectivityPrediction);

      expect(window.localStorage.getItem).toHaveBeenCalledWith(`${AnalysisType[AnalysisType.ConnectivityPrediction]}_result`);
      expect(result).toBeDefined();
      expect(result).toEqual(jasmine.any(Object));
    });

    it('should works when storage is empty', () => {
      const taskResult = analysisResultFromServer.taskResult;

      spyOn(window.localStorage, 'getItem').and.returnValue(null);

      const result = service.getTaskResultFromStorage(AnalysisType.ConnectivityPrediction);

      expect(window.localStorage.getItem).toHaveBeenCalledWith(`${AnalysisType[AnalysisType.ConnectivityPrediction]}_result`);
      expect(result).toEqual(null);
    });
  });

  describe('#postNewPredictionAnalysis', () => {
    it('should exists', () => {
      expect(service.postNewPredictionAnalysis).toBeDefined();
      expect(service.postNewPredictionAnalysis).toEqual(jasmine.any(Function));
    });

    it('should works', (done) => {
      const localityFile = new File(['sample'], 'locality.csv', { type: 'text/csv' });
      const schoolFile = new File(['sample'], 'school.csv', { type: 'text/csv' });

      // Trigger the file upload and subscribe for results
      service.postNewPredictionAnalysis(schoolFile, localityFile).pipe(
        // Discard the first response
        skipWhile((progress: any) => {
          return progress === 0;
        })
      ).subscribe(
        (event: any) => {
          // Define what we expect after receiving the progress response
          //expect(progress).toEqual(70);
          if (event.type === HttpEventType.UploadProgress) {
            const progress = Math.round(100 * event.loaded / event.total);
            expect(progress).toEqual(70);
          }
          done();
        }
      );

      // Match a request to service.url
      const req = httpTestingController.expectOne(endpointPostPredictionTaskUri);
      expect(req.request.method).toEqual('POST');
      // Respond with a mocked UploadProgress HttpEvent
      req.event({ type: HttpEventType.UploadProgress, loaded: 7, total: 10 });
    });
  });

  describe('#postNewEmployabilityImpactAnalysis', () => {
    it('should exists', () => {
      expect(service.postNewEmployabilityImpactAnalysis).toBeDefined();
      expect(service.postNewEmployabilityImpactAnalysis).toEqual(jasmine.any(Function));
    });

    it('should works', (done) => {
      const localityFile = new File(['sample'], 'locality.csv', { type: 'text/csv' });
      const schoolHistoryFile = new File(['sample'], 'school.csv', { type: 'text/csv' });
      const homogenizeColumns = ['hdi', 'population_size'];
      const connectivityThresholdA = 2;
      const connectivityThresholdB = 1;
      const municipalitiesThreshold = 0.03;

      // Trigger the file upload and subscribe for results
      service
        .postNewEmployabilityImpactAnalysis(
          schoolHistoryFile,
          localityFile,
          homogenizeColumns,
          connectivityThresholdA,
          connectivityThresholdB,
          municipalitiesThreshold)
        .pipe(
          // Discard the first response
          skipWhile((progress: any) => {
            return progress === 0;
          })
        ).subscribe(
          (event: any) => {
            // Define what we expect after receiving the progress response
            //expect(progress).toEqual(70);
            if (event.type === HttpEventType.UploadProgress) {
              const progress = Math.round(100 * event.loaded / event.total);
              expect(progress).toEqual(70);
            }
            done();
          }
        );

      let expectedPath = endpointPostEmployabilityImpactTaskUri;
      expectedPath += `?connectivity_threshold_A=${connectivityThresholdA}`;
      expectedPath += `&connectivity_threshold_B=${connectivityThresholdB}`;
      expectedPath += `&municipalities_threshold=${municipalitiesThreshold}`;

      // Match a request to service.url
      const req = httpTestingController.expectOne(expectedPath);
      expect(req.request.method).toEqual('POST');
      // Respond with a mocked UploadProgress HttpEvent
      req.event({ type: HttpEventType.UploadProgress, loaded: 7, total: 10 });
    });
  });

  describe('#putTaskResultOnStorage', () => {
    it('should exists', () => {
      expect(service.putTaskResultOnStorage).toBeDefined();
      expect(service.putTaskResultOnStorage).toEqual(jasmine.any(Function));
    });

    it('should works', () => {
      const taskResult = analysisResultFromServer.taskResult;
      const analysisResult: AnalysisResult = new AnalysisResult().deserialize(taskResult);

      spyOn(window.localStorage, 'setItem');

      service.putTaskResultOnStorage(AnalysisType.ConnectivityPrediction, analysisResult);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(`${AnalysisType[AnalysisType.ConnectivityPrediction]}_result`, JSON.stringify(analysisResult))
    });
  });
});
